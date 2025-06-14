import {
  ProviderConfig,
  OpenAIStreamResponse,
  OpenAINonStreamResponse,
} from "@/types/llms";
import {
  transformOpenAIMessages,
  createOpenAIBody,
} from "../utils/messageTransforms";
import { Message } from "@/types/chat";
import OpenAI from "openai";
import { imageCapableModels } from "@/constants/imageModels";
import fs from "fs";
import { createAttachmentApi } from "@/lib/apiServerActions/chat";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const openaiConfig: ProviderConfig = {
  endpoint: "https://api.openai.com/v1/chat/completions",
  headers: (apiKey) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  }),
  transformMessages: transformOpenAIMessages,
  transformBody: createOpenAIBody,
  parseStreamContent: (parsed: unknown) => {
    const response = parsed as OpenAIStreamResponse;
    const content = response.choices?.[0]?.delta?.content;
    return content ? { content } : null;
  },
  parseNonStreamContent: (data: unknown) => {
    const response = data as OpenAINonStreamResponse;
    return response.choices?.[0]?.message?.content?.trim() || "";
  },
};

export async function callOpenAIStreaming(
  userId: string,
  messages: Message[],
  modelId: string,
  apiKey: string,
  isImageGeneration?: boolean,
  lastResponseId?: string
): Promise<ReadableStream> {
  const openai = new OpenAI({
    apiKey,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: any[] = [];
  const noTimestampMessages = messages.map((message) => {
    return {
      role: message.role,
      content: message.content,
    };
  });

  if (isImageGeneration && imageCapableModels.includes(modelId)) {
    tools = [
      {
        type: "image_generation",
        size: "auto",
        quality: "high",
        output_format: "png",
        background: "auto",
        moderation: "auto",
        partial_images: 3,
      },
    ];
  }
  const stream = await openai.responses.create({
    model: modelId,
    input: noTimestampMessages,
    stream: true,
    previous_response_id: lastResponseId,
    tools: tools,
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ content: event.delta })}\n\n`
              )
            );
          }
          if (event.type === "response.image_generation_call.in_progress") {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  image_generation_status: "Starting image generation...",
                })}\n\n`
              )
            );
          }
          if (event.type === "response.image_generation_call.generating") {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  image_generation_status: "Image generation in progress...",
                })}\n\n`
              )
            );
          }
          if (event.type === "response.image_generation_call.partial_image") {
            // save to temp file
            const iteration = event.partial_image_index;
            const filename = `partial-${userId}-${iteration}${Date.now()}.png`;
            const dirpath = `./local-attachment-store/${userId}`;
            if (!fs.existsSync(dirpath)) {
              fs.mkdirSync(dirpath, { recursive: true });
            }
            const filepath = `./local-attachment-store/${userId}/${filename}`;
            fs.writeFileSync(
              filepath,
              Buffer.from(event.partial_image_b64, "base64")
            );
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  partial_image: `![${filename}](${`${baseUrl}/api/images/${filename}`}) `,
                })}\n\n`
              )
            );
          }
          if (event.type === "response.image_generation_call.completed") {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  content: "Image generation completed!",
                })}\n\n`
              )
            );
          }
          if (
            event.type === "response.output_item.done" &&
            event.item.type === "image_generation_call"
          ) {
            const imageBase64 = event.item.result as string;
            const timestamp = Date.now();
            const filename = `${timestamp}.png`;
            const dirpath = `./local-attachment-store/${userId}`;
            if (!fs.existsSync(dirpath)) {
              fs.mkdirSync(dirpath, { recursive: true });
            }

            const filepath = `./local-attachment-store/${userId}/${filename}`;

            fs.writeFileSync(filepath, Buffer.from(imageBase64, "base64"));
            createAttachmentApi(userId, filename, "image/png", filepath);

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  image_url: `![${filename}](${`${baseUrl}/api/images/${userId}-${filename}`}) [Download](${`${baseUrl}/api/images/${userId}-${filename}?download=true`})\n\n `,
                })}\n\n`
              )
            );
          }
          if (event.type === "response.completed") {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  previous_response_id: event.response.id,
                })}\n\n`
              )
            );
            const dirpath = `./local-attachment-store/${userId}`;
            if (fs.existsSync(dirpath)) {
              fs.readdirSync(dirpath).forEach((file) => {
                if (file.startsWith("partial-")) {
                  fs.unlinkSync(`${dirpath}/${file}`);
                }
              });
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
