import { useMemberId } from "@/hooks/use-member-id";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useGetMember } from "@/features/members/api/use-get-member";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { Loader2 } from "lucide-react";
import { useState } from "react";

// 1. 引入创建消息的 Hook
import { useCreateMessage } from "@/features/messages/api/use-create-messages";

import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";

import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { MessageList } from "@/components/message-list";
import VideoModal from "@/components/VideoModal";

interface ConversationProps {
  id: Id<"conversations">;
}

export const Conversation = ({ id }: ConversationProps) => {
  const memberId = useMemberId();
  const workspaceId = useWorkspaceId();

  const [videoOpen, setVideoOpen] = useState(false);

  // 2. 初始化发送消息的方法
  const { mutate: createMessage } = useCreateMessage();

  // A. 获取“我”的基础 ID
  const { data: myself } = useCurrentMember({ workspaceId });

  // B. 利用“我”的 ID 获取完整档案 (包含名字和头像)
  const { data: myProfile } = useGetMember({
    id: myself?._id as Id<"members">,
  });

  // 获取“对方”的信息
  const { data: member, isLoading: memberLoading } = useGetMember({
    id: memberId,
  });

  const { results, status, loadMore } = useGetMessages({
    conversationId: id,
  });

  // 3. 【新功能】处理点击通话按钮
  const handleCall = () => {
    // 如果没有获取到自己的信息，不执行
    if (!myProfile) return;

    // A. 打开自己的视频窗口
    setVideoOpen(true);

    // B. 往聊天记录里插一条消息
    // 这样对方收到消息推送，或者看到界面更新，就知道该点视频按钮了
    createMessage({
      workspaceId,
      conversationId: id,
      body: "🎥 I started a video call. Click the video icon to join!",
      images: [],
    });
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
      {/* 4. VideoModal 渲染逻辑 
          这里必须使用 myProfile (包含 user 信息)，而不是 currentMember
      */}
      {videoOpen && myProfile && (
        <VideoModal
          roomName={id} // 房间号 = 会话ID
          userName={myProfile.user.name || "Member"} // 修复：使用 myProfile 的名字，加个兜底防止 undefined
          onClose={() => setVideoOpen(false)}
        />
      )}

      <Header
        memberName={member?.user.name}
        memberImage={member?.user.image}
        onClick={() => {}}
        // 5. 绑定新的处理函数
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
