import { mutation, query } from "./_generated/server";

import { v } from "convex/values";
import { auth } from "./auth";

export const remove = mutation({
  args: {
    id: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const channel = await ctx.db.get(args.id);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member || member.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // TODO：删除channel时，需要删除channel下的所有associated things
    // 核心补全：级联删除逻辑

    // 1. 查询该频道下的所有消息
    // 使用 messages 表中以 channelId 为前缀的索引
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_id_parent_message_id_conversation_id", (q) =>
        q.eq("channelId", args.id)
      )
      .collect();

    // 2. 遍历删除所有消息及其关联资源
    for (const message of messages) {
      // A. 如果消息包含图片，先从 Storage 中删除文件，释放空间
      if (message.images) {
        for (const imageId of message.images) {
          // 忽略删除失败的情况（比如文件已经不存在），避免阻塞整个流程
          try {
            await ctx.storage.delete(imageId);
          } catch (e) {
            console.error(`Failed to delete storage ${imageId}`, e);
          }
        }
      }
      // B. 删除消息记录本身
      await ctx.db.delete(message._id);
    }
    await ctx.db.delete(args.id);

    return args.id;
  },
});

export const update = mutation({
  args: {
    id: v.id("channels"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const channel = await ctx.db.get(args.id);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member || member.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
    });

    return args.id;
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member || member.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const parsedName = args.name.replace(/\s+/g, "-").toLowerCase();
    const channelId = await ctx.db.insert("channels", {
      workspaceId: args.workspaceId,
      name: parsedName,
    });

    return channelId;
  },
});

export const getById = query({
  args: {
    id: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const channel = await ctx.db.get(args.id);
    if (!channel) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) {
      return null;
    }

    return channel;
  },
});

// convex/channels.ts

// ... 前面的 imports 保持不变 ...

// 🔥 2. 新增：标记频道为已读的 Mutation
export const markAsRead = mutation({
  args: {
    channelId: v.id("channels"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) return null;

    const existing = await ctx.db
      .query("message_reads")
      .withIndex("by_member_id_channel_id", (q) =>
        q.eq("memberId", member._id).eq("channelId", args.channelId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastReadAt: Date.now(),
      });
    } else {
      await ctx.db.insert("message_reads", {
        workspaceId: args.workspaceId,
        memberId: member._id,
        channelId: args.channelId,
        lastReadAt: Date.now(),
      });
    }
  },
});

// 🔥 3. 修改：get 查询，增加 hasAlert 和 isVideoActive 字段
export const get = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) return [];

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();

    // 并发查询每个频道的状态
    const channelsWithStatus = await Promise.all(
      channels.map(async (channel) => {
        // A. 查该频道最新的一条消息
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_channel_id_parent_message_id_conversation_id", (q) =>
            q
              .eq("channelId", channel._id)
              .eq("parentMessageId", undefined)
              .eq("conversationId", undefined)
          )
          .order("desc")
          .first();

        // B. 查用户对该频道的最后阅读时间
        const readRecord = await ctx.db
          .query("message_reads")
          .withIndex("by_member_id_channel_id", (q) =>
            q.eq("memberId", member._id).eq("channelId", channel._id)
          )
          .first();

        const lastReadTime = readRecord ? readRecord.lastReadAt : 0;

        // C. 计算是否有未读消息
        // 条件：有消息 && 不是我发的 && 消息时间 > 我的阅读时间
        const hasAlert =
          lastMessage &&
          lastMessage.memberId !== member._id &&
          lastMessage._creationTime > lastReadTime;

        // D. 计算是否正在通话
        // 条件：最新消息是 call 类型 && 还没有 callDuration (代表未结束)
        const isVideoActive =
          lastMessage?.type === "call" && !lastMessage.callDuration;

        return {
          ...channel,
          hasAlert: !!hasAlert,
          isVideoActive: !!isVideoActive,
        };
      })
    );

    return channelsWithStatus;
  },
});
