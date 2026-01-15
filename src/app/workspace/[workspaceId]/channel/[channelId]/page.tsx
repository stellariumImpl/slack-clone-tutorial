"use client";

import { useChannelId } from "@/hooks/use-channel-id";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { useGetChannel } from "@/features/channels/api/use-get-channel";
import { Loader2, TriangleAlert } from "lucide-react";

import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { MessageList } from "@/components/message-list";

// 🔥 1. 引入视频通话所需的依赖
import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCreateMessage } from "@/features/messages/api/use-create-messages";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetMember } from "@/features/members/api/use-get-member";
import VideoModal from "@/components/VideoModal"; // 确保路径正确

const ChannelIdPage = () => {
  const channelId = useChannelId();
  const workspaceId = useWorkspaceId();

  const { results, status, loadMore } = useGetMessages({
    channelId,
  });

  // 🔥 2. 新增：标记已读的 Mutation
  // 直接赋值即可，不要解构
  const markAsRead = useMutation(api.channels.markAsRead);
  // 🔥 3. 新增：核心修复 - 当进入频道或频道切换时，告诉后端“已读”
  useEffect(() => {
    if (channelId) {
      markAsRead({ channelId, workspaceId });
    }
    // 💡 增加 results 作为依赖项：
    // 每当消息列表更新（即新消息到来），如果用户在这个页面，就更新已读时间
  }, [channelId, workspaceId, markAsRead, results?.length]);

  const { data: channel, isLoading: channelLoading } = useGetChannel({
    id: channelId,
  });

  // 🔥 2. 视频通话状态管理 (直接复制自 Conversation)
  const [videoOpen, setVideoOpen] = useState(false);
  const callStartTimeRef = useRef<number | null>(null);
  const callMessageIdRef = useRef<Id<"messages"> | null>(null);

  const updateMessage = useMutation(api.messages.update);
  const { mutate: createMessage } = useCreateMessage();

  // 获取当前用户信息，用于视频通话显示名字
  const { data: myself } = useCurrentMember({ workspaceId });
  const { data: myProfile } = useGetMember({
    id: myself?._id as Id<"members">,
  });

  // 🔥 3. 开始通话处理函数
  const handleCall = async () => {
    if (!myProfile) return;

    setVideoOpen(true);
    callStartTimeRef.current = Date.now();

    // 创建一条类型为 call 的消息
    const messageId = await createMessage({
      workspaceId,
      channelId, // 传入当前频道 ID
      body: "🎥 Video call started",
      type: "call",
      images: [],
    });

    if (messageId) {
      callMessageIdRef.current = messageId;
    }
  };

  // 🔥 4. 结束通话处理函数
  const handleCallEnd = async (shouldEndCall: boolean) => {
    setVideoOpen(false);

    // 1. 获取要更新的目标消息 ID
    // 逻辑：优先用本地引用的 ID，如果刷新丢了，就从当前消息列表里找最后一条还没结束的 call 消息
    const activeCallMessage = results?.find(
      (m) => m.type === "call" && !m.callDuration
    );
    const targetMessageId = callMessageIdRef.current || activeCallMessage?._id;

    const startTime = callStartTimeRef.current;

    // 2. 执行“原地更新”
    if (shouldEndCall && targetMessageId) {
      const duration = startTime ? Date.now() - startTime : 0;
      const seconds = Math.floor(duration / 1000);
      const formatTime = `${Math.floor(seconds / 60)}m ${(seconds % 60).toString().padStart(2, "0")}s`;

      try {
        // 🔥 注意：这里是调用 updateMutation，而不是 createMutation
        await updateMessage({
          id: targetMessageId as Id<"messages">,
          callDuration: duration > 0 ? duration : 1000, // 至少记录1秒
          body: "🎥 Video call ended", // 更新 body 内容
        });
        console.log("通话状态已在原消息更新");
      } catch (error) {
        console.error("更新通话时长失败:", error);
      }
    }

    // 3. 重置状态，准备下一次通话
    callStartTimeRef.current = null;
    callMessageIdRef.current = null;
  };

  if (channelLoading || status === "LoadingFirstPage") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-white/80" />
          <p className="text-white/80 font-bold text-lg tracking-wide">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-6 text-white/80" />
          <span className="text-sm text-white/80">No channel found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 🔥 5. 渲染视频模态框 */}
      {videoOpen && myProfile && (
        <VideoModal
          roomName={channelId} // 频道通话使用 channelId 作为房间名
          userName={myProfile.user.name || "Member"}
          onClose={handleCallEnd}
        />
      )}

      {/* 🔥 6. 将 handleCall 传递给 Header */}
      <Header name={channel.name} onCall={handleCall} />

      <MessageList
        channelName={channel.name}
        channelCreationTime={channel._creationTime}
        data={results}
        loadMore={loadMore}
        isLoadingMore={status === "LoadingMore"}
        canLoadMore={status === "CanLoadMore"}
      />

      <ChatInput placeholder={`Message # ${channel.name}`} />
    </div>
  );
};

export default ChannelIdPage;
