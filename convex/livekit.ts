"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { AccessToken } from "livekit-server-sdk";

export const generateToken = action({
  args: {
    room: v.string(), // 房间号 (可以是 channelId 或 conversationId)
    username: v.string(), // 用户名 (用于显示)
  },
  handler: async (ctx, args) => {
    // 1. 初始化 AccessToken
    // 记得在 Convex Dashboard 的 Environment Variables 里设置这两个变量
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("LiveKit API keys not configured");
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: args.username, // 用户的唯一标识
      name: args.username, // UI 上显示的名字
    });

    // 2. 授予权限：允许加入房间
    at.addGrant({
      roomJoin: true,
      room: args.room,
      canPublish: true,
      canSubscribe: true,
    });

    // 3. 返回 JWT 字符串
    return await at.toJwt();
  },
});
