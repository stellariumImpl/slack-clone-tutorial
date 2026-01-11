// convex/drafts.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";

// 定义通用的参数结构
const draftArgs = {
  workspaceId: v.id("workspaces"),
  channelId: v.optional(v.id("channels")),
  conversationId: v.optional(v.id("conversations")), // 🔥 新增
  parentMessageId: v.optional(v.id("messages")),
};

// 1. 读取草稿
export const get = query({
  args: draftArgs,
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!member) return null;

    // 🔥 逻辑分支：如果是私聊，查 conversation 索引；如果是频道，查 channel 索引
    if (args.conversationId) {
      return await ctx.db
        .query("drafts")
        .withIndex("by_user_conversation", (q) =>
          q.eq("memberId", member._id).eq("conversationId", args.conversationId)
        )
        .first();
    } else {
      return await ctx.db
        .query("drafts")
        .withIndex("by_user_channel", (q) =>
          q
            .eq("memberId", member._id)
            .eq("channelId", args.channelId)
            .eq("parentMessageId", args.parentMessageId)
        )
        .first();
    }
  },
});

// 2. 保存草稿
export const save = mutation({
  args: { ...draftArgs, body: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!member) throw new Error("Unauthorized");

    // 查找现有草稿 (逻辑同 get)
    let existingDraft;
    if (args.conversationId) {
      existingDraft = await ctx.db
        .query("drafts")
        .withIndex("by_user_conversation", (q) =>
          q.eq("memberId", member._id).eq("conversationId", args.conversationId)
        )
        .first();
    } else {
      existingDraft = await ctx.db
        .query("drafts")
        .withIndex("by_user_channel", (q) =>
          q
            .eq("memberId", member._id)
            .eq("channelId", args.channelId)
            .eq("parentMessageId", args.parentMessageId)
        )
        .first();
    }

    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        body: args.body,
        updatedAt: Date.now(),
      });
      return existingDraft._id;
    } else {
      return await ctx.db.insert("drafts", {
        workspaceId: args.workspaceId,
        memberId: member._id,
        channelId: args.channelId,
        conversationId: args.conversationId, // 🔥
        parentMessageId: args.parentMessageId,
        body: args.body,
        updatedAt: Date.now(),
      });
    }
  },
});

// 3. 删除草稿
export const remove = mutation({
  args: draftArgs,
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!member) throw new Error("Unauthorized");

    let draft;
    if (args.conversationId) {
      draft = await ctx.db
        .query("drafts")
        .withIndex("by_user_conversation", (q) =>
          q.eq("memberId", member._id).eq("conversationId", args.conversationId)
        )
        .first();
    } else {
      draft = await ctx.db
        .query("drafts")
        .withIndex("by_user_channel", (q) =>
          q
            .eq("memberId", member._id)
            .eq("channelId", args.channelId)
            .eq("parentMessageId", args.parentMessageId)
        )
        .first();
    }

    if (draft) {
      await ctx.db.delete(draft._id);
    }
  },
});

// 🔥🔥 新增：获取当前工作区所有草稿，并填充名称
export const getDrafts = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    // 1. 修正 Auth 调用：使用你项目中现有的 auth.getUserId
    const userId = await auth.getUserId(ctx);

    if (!userId) {
      return [];
    }

    // 2. 修正逻辑：先找到当前用户在这个 workspace 的 member 身份
    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!member) {
      return [];
    }

    // 3. 修正查询：用 memberId 去查 drafts 表
    // 这里利用你在 schema 里定义的 "by_workspace_member" 索引
    const drafts = await ctx.db
      .query("drafts")
      .withIndex("by_workspace_member", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("memberId", member._id)
      )
      .collect();

    // 4. 填充 Channel 或 Conversation 名称 (这部分逻辑大体没变，只是为了完整性贴在这里)
    const draftsWithInfo = await Promise.all(
      drafts.map(async (draft) => {
        let name = "Untitled";
        let type: "channel" | "conversation" = "channel";
        let targetId = "";

        if (draft.channelId) {
          const channel = await ctx.db.get(draft.channelId);
          name = channel ? `# ${channel.name}` : "Deleted Channel";
          type = "channel";
          targetId = draft.channelId;
        } else if (draft.conversationId) {
          type = "conversation";
          const conversation = await ctx.db.get(draft.conversationId);
          if (conversation) {
            // 找到私聊对象
            const otherMemberId =
              conversation.memberOneId === member._id
                ? conversation.memberTwoId
                : conversation.memberOneId;

            const otherMember = await ctx.db.get(otherMemberId);
            if (otherMember) {
              const otherUser = await ctx.db.get(otherMember.userId);
              name = otherUser?.name || "User";
              targetId = otherMember._id; // 跳转私聊通常用 MemberId
            }
          }
        }

        return {
          ...draft,
          displayTitle: name,
          type,
          targetId,
        };
      })
    );

    return draftsWithInfo.sort((a, b) => b._creationTime - a._creationTime);
  },
});
