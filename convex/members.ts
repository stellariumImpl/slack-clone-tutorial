import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

const populateUser = (ctx: QueryCtx, id: Id<"users">) => {
  return ctx.db.get(id);
};

export const getById = query({
  args: { id: v.id("members") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      return null;
    }

    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", member.workspaceId).eq("userId", userId)
      );

    if (!currentMember) {
      return null;
    }

    const user = await populateUser(ctx, member.userId);
    if (!user) {
      return null;
    }

    return { ...member, user };
  },
});

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

    const data = await ctx.db
      .query("members")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();

    // 🔥 核心修改：并发查询每个成员的未读状态
    const membersWithStatus = await Promise.all(
      data.map(async (otherMember) => {
        const user = await populateUser(ctx, otherMember.userId); // 假设你有这个辅助函数，如果没有请保留原逻辑

        // 1. 查找我和这个人之间的私聊
        const conversation = await ctx.db
          .query("conversations")
          .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
          .filter((q) =>
            q.or(
              q.and(
                q.eq(q.field("memberOneId"), member._id),
                q.eq(q.field("memberTwoId"), otherMember._id)
              ),
              q.and(
                q.eq(q.field("memberOneId"), otherMember._id),
                q.eq(q.field("memberTwoId"), member._id)
              )
            )
          )
          .first();

        let hasAlert = false;
        let isVideoActive = false;

        if (conversation) {
          // 2. 查该私聊最新消息
          const lastMessage = await ctx.db
            .query("messages")
            .withIndex("by_conversation_id", (q) =>
              q.eq("conversationId", conversation._id)
            )
            .order("desc")
            .first();

          // 3. 查我的阅读记录
          const readRecord = await ctx.db
            .query("message_reads")
            .withIndex("by_member_id_conversation_id", (q) =>
              q
                .eq("memberId", member._id)
                .eq("conversationId", conversation._id)
            )
            .first();

          const lastReadTime = readRecord ? readRecord.lastReadAt : 0;

          // 4. 计算状态
          if (
            lastMessage &&
            lastMessage.memberId !== member._id &&
            lastMessage._creationTime > lastReadTime
          ) {
            hasAlert = true;
          }

          if (lastMessage?.type === "call" && !lastMessage.callDuration) {
            isVideoActive = true;
          }
        }

        return {
          ...otherMember,
          user,
          hasAlert, // 返回给前端
          isVideoActive, // 返回给前端
        };
      })
    );

    return membersWithStatus;
  },
});

export const current = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) {
      return null;
    }

    return member;
  },
});

export const update = mutation({
  args: {
    id: v.id("members"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", member.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!currentMember || currentMember.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // if (member.role === args.role) {
    //   throw new Error("Member already has this role");
    // }

    await ctx.db.patch(args.id, { role: args.role });

    return args.id;
  },
});

// 以下是逻辑上的完备性设计思路：

// 权限校验 (Authorization):

// 自己离开: 普通成员可以移除自己。

// 管理员踢人: 管理员可以移除普通成员。

// 管理员保护: 通常不允许直接踢掉另一个管理员（防止政变/误操作），也不允许管理员直接移除自己（防止工作区变成无主之地，造成孤儿数据）。

// 数据清理 (Cascading Delete):

// Messages (消息): 保留。这是最重要的逻辑。在 Slack/Discord 等软件中，成员离开后，历史消息应当保留，但发送者显示为 "Deleted User"。删除消息会破坏上下文。

// Reactions (表情回应): 删除。互动状态是依附于人的，人走了，点赞/表情应该消失。

// Conversations (私聊): 删除。因为私聊是 1v1 的，一方不存在了，这个会话对象（Conversation）就应该销毁（或者你在前端做非常复杂的兼容，但通常删除是更干净的做法）。

// Drafts (草稿): 删除。这是私有数据，人走了应该清空。

export const remove = mutation({
  args: {
    id: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // 1. 获取要被移除的成员 (Target)
    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // 2. 获取当前操作者 (Actor)
    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", member.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!currentMember) {
      throw new Error("Unauthorized");
    }

    // 3. 权限与规则校验逻辑
    if (member.role === "admin") {
      throw new Error("Admin cannot be removed");
      // 逻辑补充：通常 Admin 要离开，必须先将自己降级为 Member，或者转让工作区所有权
    }

    // 判断是 "踢人" 还是 "自己离开"
    if (currentMember._id !== args.id && currentMember.role !== "admin") {
      throw new Error("Unauthorized"); // 普通成员不能踢别人
    }

    // 如果是 Admin 自己想要离开 (虽然上面拦截了 Admin，但为了逻辑完备，防止未来逻辑变更)
    // 我们需要确保工作区至少还剩下一个 Admin
    if (currentMember._id === args.id && currentMember.role === "admin") {
      const allAdmins = await ctx.db
        .query("members")
        .withIndex("by_workspace_id", (q) =>
          q.eq("workspaceId", member.workspaceId)
        )
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (allAdmins.length <= 1) {
        throw new Error("Cannot leave workspace as the last admin");
      }
    }

    // 4. 数据清理 (Cascading Delete)

    // A. 收集要删除的数据
    // 注意：我们不删除 Messages (保留历史)，但我们需要删除 Reactions, Conversations, Drafts

    const [messages, reactions, conversations, drafts] = await Promise.all([
      // 仅查询消息用于统计或日志，实际上我们不执行删除
      ctx.db
        .query("messages")
        .withIndex("by_member_id", (q) => q.eq("memberId", member._id))
        .collect(),

      // 查询该成员所有的表情回应
      ctx.db
        .query("reactions")
        .withIndex("by_member_id", (q) => q.eq("memberId", member._id))
        .collect(),

      // 查询与该成员相关的私聊 (需要遍历，因为索引是 by_workspace_id)
      // 这是一个稍微昂贵的操作，但在 "移除成员" 这种低频操作中是可以接受的
      ctx.db
        .query("conversations")
        .withIndex("by_workspace_id", (q) =>
          q.eq("workspaceId", member.workspaceId)
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("memberOneId"), member._id),
            q.eq(q.field("memberTwoId"), member._id)
          )
        )
        .collect(),

      // 查询该成员的草稿
      ctx.db
        .query("drafts")
        .withIndex("by_workspace_member", (q) =>
          q.eq("workspaceId", member.workspaceId).eq("memberId", member._id)
        )
        .collect(),
    ]);

    // B. 执行删除
    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id);
    }

    for (const conversation of conversations) {
      await ctx.db.delete(conversation._id);
    }

    for (const draft of drafts) {
      await ctx.db.delete(draft._id);
    }

    // 5. 最后移除成员本身
    await ctx.db.delete(args.id);

    return args.id;
  },
});
