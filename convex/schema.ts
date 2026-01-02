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
  }),
});

export default schema;
