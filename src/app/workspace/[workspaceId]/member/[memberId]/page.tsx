"use client";

import { useCreateOrGetConversations } from "@/features/conversations/api/use-create-or-get-conversations";
import { useMemberId } from "@/hooks/use-member-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Conversation } from "./conversation";
import { useRouter } from "next/navigation";
import { useGetMember } from "@/features/members/api/use-get-member";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";

// 🔥 1. 引入获取消息的 Hook (复用 Channel 里的那个 Hook)
import { useGetMessages } from "@/features/messages/api/use-get-messages";

const MemberIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const memberId = useMemberId();

  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);

  const { mutate, isPending } = useCreateOrGetConversations();
  const markAsRead = useMutation(api.conversations.markAsRead);

  const { data: member, isLoading: memberLoading } = useGetMember({
    id: memberId,
  });

  // 🔥 2. 获取该会话的消息 (Convex 会自动订阅更新)
  // 即使 Conversation 组件里也在请求，Convex 客户端会进行去重，所以性能影响很小
  const { results } = useGetMessages({
    conversationId: conversationId === null ? undefined : conversationId,
  });

  useEffect(() => {
    if (memberLoading) return;
    if (!member) {
      toast.error("Member no longer exists");
      router.push(`/workspace/${workspaceId}`);
    }
  }, [member, memberLoading, workspaceId, router]);

  useEffect(() => {
    mutate(
      { workspaceId, memberId },
      {
        onSuccess(data) {
          if (!data) {
            router.push(`/workspace/${workspaceId}`);
            return;
          }
          setConversationId(data);
        },
        onError(error) {
          console.error(error);
          toast.error("Failed to create or get conversation");
          router.push(`/workspace/${workspaceId}`);
        },
      }
    );
  }, [memberId, workspaceId, mutate, router]);

  // 🔥 3. 核心修复：依赖项加入 results?.[0]?._id
  // 逻辑：每当“最新一条消息”的ID发生变化（即有新消息进来），且我仍在这个页面，就标记为已读
  useEffect(() => {
    if (conversationId) {
      markAsRead({ conversationId, workspaceId });
    }
  }, [
    conversationId,
    workspaceId,
    markAsRead,
    results?.[0]?._id, // 👈 监听最新消息变化
  ]);

  if (isPending || memberLoading) {
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

  if (!conversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="size-5 text-white" />
          <p className="text-white text-sm">Conversation not found</p>
        </div>
      </div>
    );
  }

  return <Conversation id={conversationId} />;
};

export default MemberIdPage;
