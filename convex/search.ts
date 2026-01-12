"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
// 🔥 修复 1: 使用具名导入 (Algolia v5)
import { algoliasearch } from "algoliasearch";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_SECRET_KEY = process.env.ALGOLIA_SECRET_KEY!;

// 初始化客户端
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SECRET_KEY);

export const indexMessage = internalAction({
  args: {
    id: v.id("messages"),
    body: v.string(),
    workspaceId: v.id("workspaces"),
    channelId: v.optional(v.id("channels")),
    memberName: v.string(),
    updatedAt: v.number(),
    // 🔥 新增这俩参数
    conversationId: v.optional(v.id("conversations")),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    await client.saveObject({
      indexName: "messages",
      body: {
        objectID: args.id,
        body: args.body,
        workspaceId: args.workspaceId,
        channelId: args.channelId,
        authorName: args.memberName,
        updatedAt: args.updatedAt,
        // 🔥 保存到 Algolia
        conversationId: args.conversationId,
        parentMessageId: args.parentMessageId,
      },
    });
  },
});

export const unindexMessage = internalAction({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // 🔥 修复 3: Algolia v5 删除写法
    await client.deleteObject({
      indexName: "messages",
      objectID: args.id,
    });
  },
});
