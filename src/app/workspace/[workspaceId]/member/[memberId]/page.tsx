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
import { useGetMember } from "@/features/members/api/use-get-member"; // 🔥 1. 引入这个实时查询 Hook

const MemberIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const memberId = useMemberId();

  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);

  // 现有逻辑：用于获取会话ID (只跑一次)
  const { mutate, isPending } = useCreateOrGetConversations();

  // 🔥 2. 新增逻辑：实时监听成员状态
  // useQuery 是响应式的，如果对方 Leave 了，这里的 member 会瞬间变成 null
  const { data: member, isLoading: memberLoading } = useGetMember({
    id: memberId,
  });

  // 🔥 3. 新增副作用：一旦发现 member 没了，立刻跳转
  useEffect(() => {
    if (memberLoading) return;

    if (!member) {
      toast.error("Member no longer exists");
      router.push(`/workspace/${workspaceId}`);
    }
  }, [member, memberLoading, workspaceId, router]);

  // 现有逻辑：初始化会话
  useEffect(() => {
    mutate(
      {
        workspaceId,
        memberId,
      },
      {
        onSuccess(data) {
          // 如果这里返回 null，说明一开始就不存在，也跳走
          if (!data) {
            // 这里的 toast 和上面的可能会重复，可以注释掉或者保留双重保险
            // toast.error("Member no longer exists");
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

  // Loading 状态合并：不仅要等 mutation，还要等 member查询
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
