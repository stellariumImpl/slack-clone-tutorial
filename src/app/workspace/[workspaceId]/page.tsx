"use client";

import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

const WorkspaceIdPage = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const [open, setOpen] = useCreateChannelModal();

  const { data: member, isLoading: memberLoading } = useCurrentMember({
    workspaceId,
  });

  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({
    id: workspaceId,
  });

  const { data: channels, isLoading: channelsLoading } = useGetChannels({
    workspaceId,
  });

  const channelId = useMemo(() => channels?.[0]?._id, [channels]);

  const isAdmin = useMemo(() => member?.role === "admin", [member?.role]);

  useEffect(() => {
    if (
      workspaceLoading ||
      channelsLoading ||
      memberLoading ||
      !member ||
      !workspace
    )
      return;

    if (channelId) {
      router.replace(`/workspace/${workspaceId}/channel/${channelId}`);
    } else if (!open && isAdmin) {
      // 接 create-channel-modal.tsx的改动，为了防止要求访客创建channel（死循环）
      setOpen(true);
    }
  }, [
    channelId,
    channelsLoading,
    workspaceLoading,
    isAdmin,
    memberLoading,
    member,
    workspace,
    open,
    setOpen,
    router,
    workspaceId,
  ]);

  if (workspaceLoading || channelsLoading || memberLoading) {
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

  if (!workspace || !member) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Workspace not found
          </span>
        </div>
      </div>
    );
  }

  // 访客看到的不再应该是要求它创建channel，而应该是提示没有channel No channel found
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
      <div className="flex flex-col items-center gap-4">
        <TriangleAlert className="size-6 text-white" />
        <span className="text-sm text-white">No channel found</span>
      </div>
    </div>
  );
};

export default WorkspaceIdPage;
