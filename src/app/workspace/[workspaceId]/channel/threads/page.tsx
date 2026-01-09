"use client";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader2 } from "lucide-react";

const ThreadsPage = () => {
  const workspaceId = useWorkspaceId();
  // 仅作演示，防止报错
  const { isLoading: membersLoading } = useGetMembers({ workspaceId });

  if (membersLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full items-center justify-center bg-white shadow-sm rounded-lg m-4">
      <h1 className="text-2xl font-bold text-gray-800">Threads</h1>
      <p className="text-gray-500 mt-2">Thread view is coming soon...</p>
    </div>
  );
};

export default ThreadsPage;
