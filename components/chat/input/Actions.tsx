"use client";

import { Button } from "@/components/ui/button";
import { Globe, Paperclip, Share2, Image as ImageIcon } from "lucide-react";
import { updateIsWebSearch } from "@/data/settings";
import { useContext } from "react";
import { ChatContext } from "@/context/ChatContext";
import { updateIsPublic } from "@/data/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { imageCapableModels } from "@/constants/imageModels";
import { updateIsImageGeneration } from "@/data/settings";
export function InputActions() {
  const {
    chatSettings,
    setChatSettings,
    conversations,
    conversationId,
    setConversations,
  } = useContext(ChatContext);
  const isWebSearch = chatSettings?.isWebSearch;
  const provider = chatSettings?.provider;
  const isImageGeneration = chatSettings?.isImageGeneration;
  const isPublic = conversations.find(
    (conversation) => conversation.id === conversationId
  )?.isPublic;
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isWebSearch ? "default" : "ghost"}
            disabled={provider !== "google"}
            className={`text-xs h-auto gap-2 rounded-full border border-solid py-1.5 pl-2 pr-2.5 max-sm:p-2 ${
              isWebSearch
                ? "border-primary bg-primary text-primary-foreground"
                : "border-secondary-foreground/10 text-muted-foreground"
            }`}
            aria-label={
              isWebSearch ? "Disable web search" : "Enable web search"
            }
            type="button"
            onClick={() => {
              // Optimistic update
              if (chatSettings) {
                setChatSettings({
                  ...chatSettings,
                  isWebSearch: !isWebSearch,
                } as typeof chatSettings);
              }
              updateIsWebSearch(!isWebSearch);
            }}
          >
            <Globe className="h-4 w-4" />
            <span className="max-sm:hidden">Search</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isWebSearch ? "Disable" : "Enable"} web search</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            disabled
            className="text-xs h-auto gap-2 rounded-full border border-solid border-secondary-foreground/10 px-2 py-1.5 pr-2.5 text-muted-foreground max-sm:p-2"
            aria-label="Attaching files is a subscriber-only feature"
            type="button"
          >
            <Paperclip className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Attach files</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={`text-xs h-auto gap-2 rounded-full border border-solid border-secondary-foreground/10 px-2 py-1.5 pr-2.5 text-muted-foreground max-sm:p-2 ${
              isPublic
                ? "border-primary bg-primary text-primary-foreground"
                : ""
            }`}
            aria-label="Share chat"
            type="button"
            onClick={() => {
              setConversations(
                conversations.map((conversation) =>
                  conversation.id === conversationId
                    ? { ...conversation, isPublic: !isPublic }
                    : conversation
                )
              );
              if (conversationId) {
                updateIsPublic(conversationId, !isPublic);
              }
            }}
          >
            <Share2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Share chat</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            disabled={!imageCapableModels.includes(chatSettings?.model || "")}
            className={`text-xs h-auto gap-2 rounded-full border border-solid border-secondary-foreground/10 px-2 py-1.5 pr-2.5 text-muted-foreground max-sm:p-2 ${
              isImageGeneration
                ? "border-primary bg-primary text-primary-foreground"
                : ""
            }`}
            aria-label="Generate image"
            type="button"
            onClick={() => {
              setChatSettings({
                ...chatSettings!,
                isImageGeneration: !isImageGeneration,
              });
              updateIsImageGeneration(!isImageGeneration);
            }}
          >
            <ImageIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isImageGeneration ? "Disable" : "Enable"} image generation</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
