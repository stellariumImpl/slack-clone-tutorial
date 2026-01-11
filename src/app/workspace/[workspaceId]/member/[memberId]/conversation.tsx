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

// 🔥 1. 引入 usePanel 用于打开侧边栏
import { usePanel } from "@/hooks/use-panel";

interface ConversationProps {
  id: Id<"conversations">;
}

export const Conversation = ({ id }: ConversationProps) => {
  const updateMessage = useMutation(api.messages.update);
  const memberId = useMemberId();
  const workspaceId = useWorkspaceId();

  // 🔥 2. 获取打开 Profile 的方法
  const { onOpenProfile } = usePanel();

  const [videoOpen, setVideoOpen] = useState(false);

  const callStartTimeRef = useRef<number | null>(null);
  const callMessageIdRef = useRef<Id<"messages"> | null>(null);

  const { mutate: createMessage } = useCreateMessage();

  // 这里已经获取了当前登录用户 (myself)
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

  const handleCall = async () => {
    if (!myProfile) return;

    setVideoOpen(true);
    callStartTimeRef.current = Date.now();

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

  const handleCallEnd = async (shouldEndCall: boolean) => {
    setVideoOpen(false);

    const messageId = callMessageIdRef.current;
    const startTime = callStartTimeRef.current;

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

  // 🔥 3. 修复 isSelf 报错
  // 不要重新调用 useCurrentMember，直接使用上面已经获取的 'myself'
  const isSelf = myself?._id === memberId;

  return (
    <div className="flex flex-col h-full">
      {videoOpen && myProfile && (
        <VideoModal
          roomName={id}
          userName={myProfile.user.name || "Member"}
          onClose={handleCallEnd}
        />
      )}

      <Header
        memberName={member?.user.name}
        memberImage={member?.user.image}
        // 🔥 4. 添加点击事件，打开 Profile 面板
        onClick={() => onOpenProfile(memberId)}
        onCall={handleCall}
        isSelf={isSelf}
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
