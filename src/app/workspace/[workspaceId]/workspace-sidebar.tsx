"use client";

import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useChannelId } from "@/hooks/use-channel-id";
import { useMemberId } from "@/hooks/use-member-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Loader,
  AlertTriangle,
  MessageSquareText,
  SendHorizonal,
  HashIcon,
} from "lucide-react";

import { WorkspaceHeader } from "./workspace-header";
import { SidebarItem } from "./sidebar-item";
import { WorkspaceSection } from "./workspace-section";
import { UserItem } from "./user-item";
import { Search } from "@/components/search";
import { cn } from "@/lib/utils";

interface WorkspaceSidebarProps {
  className?: string;
  isPhone?: boolean;
}

export const WorkspaceSidebar = ({
  className,
  isPhone,
}: WorkspaceSidebarProps) => {
  const pathname = usePathname();
  const memberId = useMemberId();
  const channelId = useChannelId();
  const workspaceId = useWorkspaceId();

  const [_open, setOpen] = useCreateChannelModal();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: member, isLoading: memberLoading } = useCurrentMember({
    workspaceId,
  });
  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({
    id: workspaceId,
  });
  const { data: channels, isLoading: channelsLoading } = useGetChannels({
    workspaceId,
  });
  const { data: members, isLoading: membersLoading } = useGetMembers({
    workspaceId,
  });

  const isLoading = memberLoading || workspaceLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col bg-[#8364bd] h-full items-center justify-center">
        <Loader className="size-5 animate-spin text-white" />
      </div>
    );
  }

  const isUnauthorized = !workspace || !member;

  if (isUnauthorized) {
    return (
      <div className="flex flex-col gap-y-2 bg-[#8364bd] h-full items-center justify-center">
        <AlertTriangle className="size-5 text-white" />
        <p className="text-white text-sm">Workspace not found</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-[#8364bd] h-full",
        className,
        isPhone && "border-none"
      )}
    >
      <Search open={searchOpen} setOpen={setSearchOpen} />

      <WorkspaceHeader
        workspace={workspace}
        isAdmin={member.role === "admin"}
        onSearchClick={() => setSearchOpen(true)}
        isPhone={isPhone}
      />

      <div className="flex flex-col px-2 mt-3">
        <SidebarItem
          label="Threads"
          icon={MessageSquareText}
          id="threads"
          variant={pathname.includes("/threads") ? "active" : "default"}
        />
        <SidebarItem
          label="Drafts"
          icon={SendHorizonal}
          id="drafts"
          variant={pathname.includes("/drafts") ? "active" : "default"}
        />
      </div>

      <WorkspaceSection
        label="Channels"
        hint="New channel"
        onNew={member.role === "admin" ? () => setOpen(true) : undefined}
      >
        {channels?.map((item) => (
          <SidebarItem
            key={item._id}
            label={item.name}
            icon={HashIcon}
            id={item._id}
            variant={item._id === channelId ? "active" : "default"}
            hasAlert={item.hasAlert}
            isVideoActive={item.isVideoActive}
          />
        ))}
      </WorkspaceSection>

      <WorkspaceSection label="Direct Messages" hint="New direct message">
        {members?.map((item) => (
          <UserItem
            key={item._id}
            id={item._id}
            // 🔥 核心修正：加上 ?. 防止 null 报错，并提供默认值
            label={item.user?.name ?? "Member"}
            image={item.user?.image}
            variant={item._id === memberId ? "active" : "default"}
            // 🔥 核心修正：透传状态（确保后端 members.ts 的 get 查询已更新）
            hasAlert={item.hasAlert}
            isVideoActive={item.isVideoActive}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
};
