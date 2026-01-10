import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { auth } from "./auth";
import { Id, Doc } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

const populateThread = async (ctx: QueryCtx, messageId: Id<"messages">) => {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_parent_message_id", (q) =>
      q.eq("parentMessageId", messageId)
    )
    .collect();

  if (messages.length === 0) {
    return {
      count: 0,
      images: [],
      timestamp: 0,
      name: "",
    };
  }

  const lastMessage = messages[messages.length - 1];
  const lastMessageMember = await populateMember(ctx, lastMessage.memberId);

  if (!lastMessageMember) {
    return {
      count: 0,
      images: [],
      timestamp: 0,
      name: "",
    };
  }

  const lastMessageUser = await populateUser(ctx, lastMessageMember.userId);

  return {
    count: messages.length,
    images: lastMessageUser?.image ? [lastMessageUser.image] : [],
    timestamp: lastMessage._creationTime,
    name: lastMessageUser?.name,
  };
};

const populateReactions = (ctx: QueryCtx, messageId: Id<"messages">) => {
  return ctx.db
    .query("reactions")
    .withIndex("by_message_id", (q) => q.eq("messageId", messageId))
    .collect();
};

const populateUser = (ctx: QueryCtx, userId: Id<"users">) => {
  return ctx.db.get(userId);
};

export const populateMember = (ctx: QueryCtx, memberId: Id<"members">) => {
  return ctx.db.get(memberId);
};

const getMember = async (
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">
) => {
  return ctx.db
    .query("members")
    .withIndex("by_workspace_id_user_id", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .unique();
};

export const remove = mutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const message = await ctx.db.get(args.id);
    if (!message) {
      throw new Error("Message not found");
    }

    const member = await getMember(ctx, message.workspaceId, userId);
    if (!member || member._id !== message.memberId) {
      throw new Error("Member not found");
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});

export const update = mutation({
  args: {
    id: v.id("messages"),
    body: v.optional(v.string()), // 允许更新内容
    callDuration: v.optional(v.number()), // 允许更新时长
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const message = await ctx.db.get(args.id);
    if (!message) {
      throw new Error("Message not found");
    }

    // const member = await getMember(ctx, message.workspaceId, userId);
    // if (!member || member._id !== message.memberId) {
    //   throw new Error("Member not found");
    // }
    // 太严格了 我们把规则拆开

    const member = await getMember(ctx, message.workspaceId, userId);
    if (!member) {
      throw new Error("Unauthorized");
    }

    // ---------------------------------------------------------
    // 权限验证逻辑
    // ---------------------------------------------------------

    // 1. 判断是否是消息的作者
    const isAuthor = message.memberId === member._id;

    // 2. 判断是否是管理员
    const isAdmin = member.role === "admin";

    // 3. 【核心修改】开始分情况讨论

    // 情况 A：如果是普通文本消息 (或者没有 type 字段)，执行严格检查
    // 必须是作者本人，或者是管理员才能改
    if (!message.type || message.type === "text") {
      if (!isAuthor && !isAdmin) {
        throw new Error("Unauthorized");
      }
    }

    // 情况 B：如果是通话记录 (call)
    // 允许：作者本人 OR 对话的参与者 (MemberOne / MemberTwo)
    else if (message.type === "call") {
      // 如果已经是作者，直接过
      if (!isAuthor && !isAdmin) {
        // 如果不是作者，检查是否是 1v1 对话的另一方
        if (!message.conversationId) {
          throw new Error("Unauthorized"); // 通话通常都有 conversationId
        }

        const conversation = await ctx.db.get(message.conversationId);
        if (!conversation) {
          throw new Error("Conversation not found");
        }

        const isParticipant =
          conversation.memberOneId === member._id ||
          conversation.memberTwoId === member._id;

        if (!isParticipant) {
          throw new Error("Unauthorized");
        }
      }
    } else {
      // 其他未知类型，默认拒绝
      if (!isAuthor && !isAdmin) {
        throw new Error("Unauthorized");
      }
    }

    await ctx.db.patch(args.id, {
      // body: args.body,
      // 更新
      ...(args.body ? { body: args.body } : {}),
      ...(args.callDuration ? { callDuration: args.callDuration } : {}),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const getById = query({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const message = await ctx.db.get(args.id);
    if (!message) {
      return null;
    }

    const currentMember = await getMember(ctx, message.workspaceId, userId);
    if (!currentMember) {
      return null;
    }

    const member = await populateMember(ctx, message.memberId);
    if (!member) {
      return null;
    }

    const user = await populateUser(ctx, member.userId);
    if (!user) {
      return null;
    }

    const reactions = await populateReactions(ctx, message._id);

    const reactionsWithCounts = reactions.map((reaction) => {
      return {
        ...reaction,
        count: reactions.filter((r) => r.value === reaction.value).length,
      };
    });

    const dedupedReactions = reactionsWithCounts.reduce(
      (acc, reaction) => {
        const existingReaction = acc.find((r) => r.value === reaction.value);

        if (existingReaction) {
          existingReaction.memberIds = Array.from(
            new Set([...existingReaction.memberIds, reaction.memberId])
          );
        } else {
          acc.push({ ...reaction, memberIds: [reaction.memberId] });
        }

        return acc;
      },
      [] as (Doc<"reactions"> & {
        count: number;
        memberIds: Id<"members">[];
      })[]
    );

    const reactionsWithoutMemberIdProperty = dedupedReactions.map(
      ({ memberId, ...rest }) => rest
    );

    // -------------- 新增部分开始 --------------
    // 并发获取所有图片的 URL
    const images = await Promise.all(
      (message.images || []).map(async (imageId) => {
        return await ctx.storage.getUrl(imageId);
      })
    );
    // -------------- 新增部分结束 --------------

    return {
      ...message,
      images: images.filter((url): url is string => url !== null),
      user,
      member,
      reactions: reactionsWithoutMemberIdProperty,
    };
  },
});

export const get = query({
  args: {
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    parentMessageId: v.optional(v.id("messages")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let _conversationId = args.conversationId;
    if (!args.conversationId && !args.channelId && args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);

      if (!parentMessage) {
        throw new Error("Parent message not found");
      }

      _conversationId = parentMessage.conversationId;
    }

    const results = await ctx.db
      .query("messages")
      .withIndex("by_channel_id_parent_message_id_conversation_id", (q) =>
        q
          .eq("channelId", args.channelId)
          .eq("parentMessageId", args.parentMessageId)
          .eq("conversationId", _conversationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...results,
      page: (
        await Promise.all(
          results.page.map(async (message) => {
            const member = await populateMember(ctx, message.memberId);
            const user = member ? await populateUser(ctx, member.userId) : null;

            if (!member || !user) {
              return null;
            }

            const reactions = await populateReactions(ctx, message._id);
            const thread = await populateThread(ctx, message._id);

            // 1. 如果 message.images 存在，遍历 ID 数组
            // 2. 使用 Promise.all 并发获取所有图片的 URL
            // 3. 过滤掉可能生成的 null 值
            const images = await Promise.all(
              (message.images || []).map(async (imageId) => {
                return await ctx.storage.getUrl(imageId);
              })
            );

            const reactionsWithCounts = reactions.map((reaction) => {
              return {
                ...reaction,
                count: reactions.filter((r) => r.value === reaction.value)
                  .length,
              };
            });

            const dedupedReactions = reactionsWithCounts.reduce(
              (acc, reaction) => {
                const existingReaction = acc.find(
                  (r) => r.value === reaction.value
                );

                if (existingReaction) {
                  existingReaction.memberIds = Array.from(
                    new Set([...existingReaction.memberIds, reaction.memberId])
                  );
                } else {
                  acc.push({ ...reaction, memberIds: [reaction.memberId] });
                }

                return acc;
              },
              [] as (Doc<"reactions"> & {
                count: number;
                memberIds: Id<"members">[];
              })[]
            );

            const reactionsWithoutMemberIdProperty = dedupedReactions.map(
              ({ memberId, ...rest }) => rest
            );

            return {
              ...message,
              user,
              member,
              thread,
              images: images.filter((url): url is string => url !== null),
              reactions: reactionsWithoutMemberIdProperty,
              threadCount: thread.count,
              threadImage: thread.images,
              threadName: thread.name,
              threadTimestamp: thread.timestamp,
            };
          })
        )
      ).filter(
        (message): message is NonNullable<typeof message> => message !== null
      ),
    };
  },
});

export const create = mutation({
  args: {
    body: v.string(),
    images: v.optional(v.array(v.id("_storage"))),
    workspaceId: v.id("workspaces"),
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    parentMessageId: v.optional(v.id("messages")),

    // 允许前端传type
    type: v.optional(v.union(v.literal("text"), v.literal("call"))),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const member = await getMember(ctx, args.workspaceId, userId);
    if (!member) {
      throw new Error("Unauthorized");
    }

    // handle conversationId
    let _conversationId = args.conversationId;

    // Only possible if we are replying in a thread in 1:1 conversation
    if (!args.conversationId && !args.channelId && args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);

      if (!parentMessage) {
        throw new Error("Parent message not found");
      }

      _conversationId = parentMessage.conversationId;
    }

    // -------------------------------------------------------------
    // 【新增核心逻辑】防止重复创建通话消息
    // -------------------------------------------------------------

    if (args.type === "call" && _conversationId) {
      // 查一下该对话中，最近的一条消息
      const existingCall = await ctx.db
        .query("messages")
        // 使用你现有的索引
        .withIndex("by_channel_id_parent_message_id_conversation_id", (q) =>
          q
            .eq("channelId", args.channelId) // 通常是 undefined
            .eq("parentMessageId", args.parentMessageId) // 通常是 undefined
            .eq("conversationId", _conversationId)
        )
        .order("desc")
        .first();

      // 如果最近一条是通话，且还没结束 (没有 callDuration)
      if (
        existingCall &&
        existingCall.type === "call" &&
        !existingCall.callDuration
      ) {
        // 直接返回旧 ID，不创建新消息！
        // 这样前端会收到这个 ID，然后加入房间，界面上也不会多一个气泡
        return existingCall._id;
      }
    }
    // -------------------------------------------------------------

    // insert messages
    const messageId = await ctx.db.insert("messages", {
      memberId: member._id,
      body: args.body,
      images: args.images,
      channelId: args.channelId,
      conversationId: _conversationId,
      workspaceId: args.workspaceId,
      parentMessageId: args.parentMessageId,
      // updatedAt: Date.now(),
      // 存入type
      type: args.type || "text",
    });

    // 新增：如果是回复消息，更新父消息的 Thread 统计数据
    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);

      if (parentMessage) {
        await ctx.db.patch(args.parentMessageId, {
          replyCount: (parentMessage.replyCount || 0) + 1,
          lastReplyAt: Date.now(),
        });
      }
    }

    return messageId;
  },
});

// ---------------------------------------------------------------------
// 新增 getThreads 查询 API
// ---------------------------------------------------------------------
export const getThreads = query({
  args: {
    workspaceId: v.id("workspaces"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { page: [], isDone: false, continueCursor: "" };

    const member = await getMember(ctx, args.workspaceId, userId);
    if (!member) return { page: [], isDone: false, continueCursor: "" };

    // // 🔍 【DEBUG 1】打印查询条件
    // console.log(
    //   "👉 [Backend] getThreads called for Workspace:",
    //   args.workspaceId
    // );

    // 利用新索引查询：查该 Workspace 下所有有 lastReplyAt 值的消息，按时间倒序
    const results = await ctx.db
      .query("messages")
      .withIndex("by_workspace_id_last_reply_at", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc") // 最新的回复排前面
      .paginate(args.paginationOpts);

    // // 🔍 【DEBUG 2】打印查到的原始数据条数
    // console.log("👉 [Backend] Raw results count:", results.page.length);
    // if (results.page.length > 0) {
    //   console.log("👉 [Backend] First item sample:", results.page[0]);
    // }

    return {
      ...results,
      page: (
        await Promise.all(
          results.page.map(async (message) => {
            // 过滤掉没有回复的普通消息 (理论上 index 应该只包含有值的，但双重保险)
            if (!message.lastReplyAt) {
              // // 🔍 【DEBUG 3】检查每一条消息是否有 lastReplyAt
              // console.log(
              //   "⚠️ [Backend] Skipping message because no lastReplyAt:",
              //   message._id
              // );
              return null;
            }

            const member = await populateMember(ctx, message.memberId);
            const user = member ? await populateUser(ctx, member.userId) : null;

            if (!member || !user) return null;

            // 获取 Channel 信息，用于 UI 显示 "#General" 并跳转
            const channel = message.channelId
              ? await ctx.db.get(message.channelId)
              : null;

            // 核心修复：把 Storage ID 转换成 URL
            const images = await Promise.all(
              (message.images || []).map(async (imageId) => {
                return await ctx.storage.getUrl(imageId);
              })
            );
            return {
              ...message,
              member,
              user,
              channel,
              channelName: channel?.name,
              // 用生成的 URL 数组覆盖掉原来的 ID 数组
              images: images.filter((url): url is string => url !== null),
            };
          })
        )
      ).filter((t): t is NonNullable<typeof t> => t !== null),
    };
  },
});

// 这是一个一次性工具，用来修复旧数据
// export const backfillThreadData = mutation({
//   args: {},
//   handler: async (ctx) => {
//     // 1. 查出所有的消息
//     const allMessages = await ctx.db.query("messages").collect();

//     let count = 0;

//     for (const msg of allMessages) {
//       // 如果这条消息有 parentMessageId，说明它是一条回复
//       if (msg.parentMessageId) {
//         // 找到它的父消息
//         const parent = await ctx.db.get(msg.parentMessageId);
//         if (parent) {
//           // 更新父消息的 lastReplyAt 和 replyCount
//           await ctx.db.patch(parent._id, {
//             lastReplyAt: msg._creationTime, // 简单起见，用最近一条回复的时间覆盖
//             replyCount: (parent.replyCount || 0) + 1,
//           });
//           count++;
//         }
//       }
//     }

//     return `Fixed ${count} threads!`;
//   },
// });
