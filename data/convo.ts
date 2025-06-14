"use server";
import { checkUser } from "@/lib/auth/check";
import { prisma } from "@/prisma";

export const branchConversation = async (conversationId: string) => {
  const { userId } = await checkUser();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
  });

  // Get all conversation IDs that should be included in the new branch
  let branchedIds: string[];

  if (conversation.branchedIds) {
    // This conversation already has a branch chain, include all of them plus this one
    const existingIds = JSON.parse(conversation.branchedIds);
    branchedIds = [...existingIds, conversationId];
  } else {
    // This is the original conversation, just include this one
    branchedIds = [conversationId];
  }

  const branchedConversation = await prisma.conversation.create({
    data: {
      userId,
      title: conversation.title,
      branchedFromConvoId: conversationId,
      branchedIds: JSON.stringify(branchedIds),
    },
  });

  await prisma.message.createMany({
    data: messages.map((message) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...messageWithoutId } = message;
      return {
        ...messageWithoutId,
        conversationId: branchedConversation.id,
      };
    }),
  });

  return branchedConversation;
};

export const createRetryConversation = async (conversationId: string) => {
  const { userId } = await checkUser();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const retryConversation = await prisma.conversation.create({
    data: {
      userId,
      title: conversation.title || " New Chat",
      isRetry: true,
    },
  });

  return retryConversation;
};

export const pinConversation = async (conversationId: string) => {
  const { userId } = await checkUser();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isPinned: !conversation.isPinned },
  });
};
