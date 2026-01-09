import { useMemberId } from "@/hooks/use-member-id";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useGetMember } from "@/features/members/api/use-get-member";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { Loader2 } from "lucide-react";
import { useState, useRef } from "react";

import { useCreateMessage } from "@/features/messages/api/use-create-messages";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";

import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { MessageList } from "@/components/message-list";
import VideoModal from "@/components/VideoModal";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";

interface ConversationProps {
  id: Id<"conversations">;
}

export const Conversation = ({ id }: ConversationProps) => {
  const updateMessage = useMutation(api.messages.update);
  const memberId = useMemberId();
  const workspaceId = useWorkspaceId();

  const [videoOpen, setVideoOpen] = useState(false);

  // 引用保持不变
  const callStartTimeRef = useRef<number | null>(null);
  const callMessageIdRef = useRef<Id<"messages"> | null>(null);

  const { mutate: createMessage } = useCreateMessage();

  const { data: myself } = useCurrentMember({ workspaceId });
  const { data: myProfile } = useGetMember({
    id: myself?._id as Id<"members">,
  });

  const { data: member, isLoading: memberLoading } = useGetMember({
    id: memberId,
  });

  const { results, status, loadMore } = useGetMessages({
    conversationId: id,
  });

  // ---------------------------------------------------------------
  // 【关键修改 1】删除了所有 activeCallMessage 和 isCallActive 的判断
  // 前端不再猜测状态，完全信任后端返回的结果
  // ---------------------------------------------------------------

  // 4. 开始/加入通话逻辑 (极简版)
  const handleCall = async () => {
    if (!myProfile) return;

    // 立即打开窗口，无需等待接口返回，提升响应速度体验
    setVideoOpen(true);
    callStartTimeRef.current = Date.now();

    // 直接请求创建！
    // 逻辑由后端控制：
    // - 如果当前无通话 -> 后端创建新消息 -> 返回新 ID (Create)
    // - 如果当前有通话 -> 后端查到旧消息 -> 返回旧 ID (Join)
    const messageId = await createMessage({
      workspaceId,
      conversationId: id,
      body: "🎥 Video call started",
      type: "call",
      images: [],
    });

    if (messageId) {
      callMessageIdRef.current = messageId;
    }
  };

  // 5. 挂断逻辑 (只关窗口，不更新数据库)
  // 修改 handleCallEnd，接收参数
  const handleCallEnd = async (shouldEndCall: boolean) => {
    // 1. 无论如何，先关闭本地视频窗口
    setVideoOpen(false);

    const messageId = callMessageIdRef.current;
    const startTime = callStartTimeRef.current;

    // 2. 只有当 shouldEndCall 为 true (我是最后一个人) 时，才去更新数据库
    if (shouldEndCall && messageId && startTime) {
      const duration = Date.now() - startTime;

      const seconds = Math.floor(duration / 1000);
      const formatTime = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

      try {
        await updateMessage({
          id: messageId,
          callDuration: duration,
          body: `🎥 Call ended - Duration: ${formatTime}`,
        });
      } catch (error) {
        console.error("Failed to update call duration:", error);
      }
    } else {
      console.log(
        "Left the call, but others are still there. Not ending session."
      );
    }

    // 3. 重置本地引用
    callStartTimeRef.current = null;
    callMessageIdRef.current = null;
  };

  if (memberLoading || status === "LoadingFirstPage") {
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

  return (
    <div className="flex flex-col h-full">
      {videoOpen && myProfile && (
        <VideoModal
          roomName={id}
          userName={myProfile.user.name || "Member"}
          // 这里会自动把 true/false 传给 handleCallEnd
          onClose={handleCallEnd}
        />
      )}

      <Header
        memberName={member?.user.name}
        memberImage={member?.user.image}
        onClick={() => {}}
        onCall={handleCall}
      />

      <MessageList
        data={results}
        variant="conversation"
        memberImage={member?.user.image}
        memberName={member?.user.name}
        loadMore={loadMore}
        isLoadingMore={status === "LoadingMore"}
        canLoadMore={status === "CanLoadMore"}
      />

      <ChatInput
        placeholder={`Message ${member?.user.name}`}
        conversationId={id}
      />
    </div>
  );
};
