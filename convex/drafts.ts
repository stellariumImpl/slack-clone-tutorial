import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// 定义通用的参数结构
const draftArgs = {
  workspaceId: v.id("workspaces"),
  channelId: v.optional(v.id("channels")),
  conversationId: v.optional(v.id("conversations")),
  parentMessageId: v.optional(v.id("messages")),
};

// 1. 读取草稿 (核心修复点)
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

    // ⬇️⬇️⬇️ 核心修复逻辑 ⬇️⬇️⬇️
    // 无论查频道还是私聊，必须加 .filter 来精确匹配 parentMessageId
    // 这样 "undefined" (主对话) 和 "id" (Thread) 就不会混淆了

    if (args.conversationId) {
      return await ctx.db
        .query("drafts")
        .withIndex("by_user_conversation", (q) =>
          q.eq("memberId", member._id).eq("conversationId", args.conversationId)
        )
        // 🔥 严厉过滤：Thread ID 必须完全一致（包括 null/undefined）
        .filter((q) => q.eq(q.field("parentMessageId"), args.parentMessageId))
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
        // 🔥 双重保险
        .filter((q) => q.eq(q.field("parentMessageId"), args.parentMessageId))
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

    // 查找现有草稿 (逻辑同 get，防止覆盖错误的草稿)
    let existingDraft;
    if (args.conversationId) {
      existingDraft = await ctx.db
        .query("drafts")
        .withIndex("by_user_conversation", (q) =>
          q.eq("memberId", member._id).eq("conversationId", args.conversationId)
        )
        // 🔥 严厉过滤
        .filter((q) => q.eq(q.field("parentMessageId"), args.parentMessageId))
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
        // 强制同步 ID，保持数据完整
        channelId: args.channelId,
        conversationId: args.conversationId,
        parentMessageId: args.parentMessageId,
      });
      return existingDraft._id;
    } else {
      return await ctx.db.insert("drafts", {
        workspaceId: args.workspaceId,
        memberId: member._id,
        channelId: args.channelId,
        conversationId: args.conversationId,
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

    // 删除时也要精确打击，防止误删 Thread 的草稿
    let drafts = [];
    if (args.conversationId) {
      drafts = await ctx.db
        .query("drafts")
        .withIndex("by_user_conversation", (q) =>
          q.eq("memberId", member._id).eq("conversationId", args.conversationId)
        )
        // 🔥 严厉过滤
        .filter((q) => q.eq(q.field("parentMessageId"), args.parentMessageId))
        .collect();
    } else {
      drafts = await ctx.db
        .query("drafts")
        .withIndex("by_user_channel", (q) =>
          q
            .eq("memberId", member._id)
            .eq("channelId", args.channelId)
            .eq("parentMessageId", args.parentMessageId)
        )
        .collect();
    }

    for (const draft of drafts) {
      await ctx.db.delete(draft._id);
    }
  },
});

// 4. 获取所有草稿 (列表页用 - 带智能名称回退)
export const getDrafts = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!member) return [];

    const drafts = await ctx.db
      .query("drafts")
      .withIndex("by_workspace_member", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("memberId", member._id)
      )
      .collect();

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
            const otherMemberId =
              conversation.memberOneId === member._id
                ? conversation.memberTwoId
                : conversation.memberOneId;

            const otherMember = await ctx.db.get(otherMemberId);
            if (otherMember) {
              const otherUser = await ctx.db.get(otherMember.userId);
              name = otherUser?.name || "User";
              targetId = otherMember._id;
            }
          }
        } else if (draft.parentMessageId) {
          // 智能回退：如果是回复旧消息的草稿，尝试找父消息作者名
          type = "conversation";
          const parentMessage = await ctx.db.get(draft.parentMessageId);
          if (parentMessage) {
            const parentMember = await ctx.db.get(parentMessage.memberId);
            if (parentMember) {
              const parentUser = await ctx.db.get(parentMember.userId);
              name = parentUser?.name || "Member";
              targetId = parentMember._id;
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
