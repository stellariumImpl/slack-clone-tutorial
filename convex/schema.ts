import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  // 展开authTables，保留sessions，accounts等其他表
  ...authTables,

  // 我们得重写users表，为了加索引
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // 如果后面有其他自定义字段（比如说role: 'admin'），加在这里
  }).index("email", ["email"]), // 关键修改：把 "by_email" 改成 "email"

  workspaces: defineTable({
    name: v.string(),
    userId: v.id("users"),
    joinCode: v.string(),
    // 新增：记录上次更新时间
    joinCodeUpdatedAt: v.optional(v.number()),
  }),

  members: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_user_id", ["userId"])
    .index("by_workspace_id", ["workspaceId"])
    .index("by_workspace_id_user_id", ["workspaceId", "userId"]),

  channels: defineTable({
    name: v.string(),
    workspaceId: v.id("workspaces"),
  }).index("by_workspace_id", ["workspaceId"]),

  conversations: defineTable({
    workspaceId: v.id("workspaces"),
    memberOneId: v.id("members"),
    memberTwoId: v.id("members"),
  }).index("by_workspace_id", ["workspaceId"]),

  messages: defineTable({
    body: v.string(),
    images: v.optional(v.array(v.id("_storage"))),
    memberId: v.id("members"),
    workspaceId: v.id("workspaces"),
    channelId: v.optional(v.id("channels")),
    parentMessageId: v.optional(v.id("messages")),
    conversationId: v.optional(v.id("conversations")),
    updatedAt: v.optional(v.number()),

    // 新增：消息类型，默认为text，通话则为call
    type: v.optional(v.union(v.literal("text"), v.literal("call"))),
    // 新增：通话时长（ms），只有通话结束才有值
    callDuration: v.optional(v.number()),

    replyCount: v.optional(v.number()), // 回复总数
    lastReplyAt: v.optional(v.number()), // 最新回复时间 (用于排序)
    participants: v.optional(v.array(v.id("members"))), // (可选) 参与者 ID 列表，用于显示头像堆叠
  })
    .index("by_workspace_id", ["workspaceId"])
    .index("by_member_id", ["memberId"])
    .index("by_channel_id", ["channelId"])
    .index("by_conversation_id", ["conversationId"]) // 新增：按 conversationId 索引
    .index("by_parent_message_id", ["parentMessageId"]) // 新增：按 parentMessageId 索引
    .index("by_channel_id_parent_message_id_conversation_id", [
      "channelId",
      "parentMessageId",
      "conversationId",
    ])
    // 新增：核心索引，用于 getThreads 查询
    // 我们要查 "某个 workspace 下，按 lastReplyAt 倒序排列的消息"
    .index("by_workspace_id_last_reply_at", ["workspaceId", "lastReplyAt"]),

  reactions: defineTable({
    workspaceId: v.id("workspaces"),
    messageId: v.id("messages"),
    memberId: v.id("members"),
    value: v.string(),
  })
    .index("by_workspace_id", ["workspaceId"])
    .index("by_message_id", ["messageId"])
    .index("by_member_id", ["memberId"]),

  drafts: defineTable({
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"), // 谁写的
    channelId: v.optional(v.id("channels")), // 在哪个频道
    parentMessageId: v.optional(v.id("messages")), // (可选) 在哪个 Thread
    body: v.string(), // 草稿内容 (HTML/JSON 字符串)
    updatedAt: v.number(),

    // 🔥 新增：支持私聊 ID
    conversationId: v.optional(v.id("conversations")),
  })
    // 索引 1：为了快速查找 "我在这个频道有没有草稿"
    .index("by_user_channel", ["memberId", "channelId", "parentMessageId"])
    // 索引 2：为了将来做 "Drafts 列表页" (查我在这个工作区所有的草稿)
    .index("by_workspace_member", ["workspaceId", "memberId"])
    // 🔥 新增：为了快速查找 "我在这个私聊里的草稿"
    .index("by_user_conversation", ["memberId", "conversationId"]),
});

export default schema;
