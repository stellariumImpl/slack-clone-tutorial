import { v } from "convex/values";
import { query } from "./_generated/server";

export const checkEmailUnique = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // 使用我们在 schema 里定义的索引来快速查询
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    // 如果查到了 user，返回 true (代表邮箱已存在)
    // 如果没查到，返回 false
    return !!user;
  },
});
