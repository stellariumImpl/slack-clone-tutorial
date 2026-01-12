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

// 引入全局搜索组件
import { Search } from "@/components/search";

export const WorkspaceSidebar = () => {
  const pathname = usePathname();
  const memberId = useMemberId();
  const channelId = useChannelId();
  const workspaceId = useWorkspaceId();

  const [_open, setOpen] = useCreateChannelModal();

  // 🔥 1. 只保留 Search 弹窗状态，删除了 Sidebar 本地的 filter 状态
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

  // 保持颜色 #8364bd
  if (isLoading) {
    return (
      <div className="flex flex-col bg-[#8364bd] h-full items-center justify-center">
        <Loader className="size-5 animate-spin text-white" />
      </div>
    );
  }

  const isUnauthorized = !workspace || !member;

  // 保持颜色 #8364bd
  if (isUnauthorized) {
    return (
      <div className="flex flex-col gap-y-2 bg-[#8364bd] h-full items-center justify-center">
        <AlertTriangle className="size-5 text-white" />
        <p className="text-white text-sm">Workspace not found</p>
      </div>
    );
  }

  return (
    // 保持颜色 #8364bd
    <div className="flex flex-col bg-[#8364bd] h-full">
      {/* 弹窗组件 */}
      <Search open={searchOpen} setOpen={setSearchOpen} />

      <WorkspaceHeader
        workspace={workspace}
        isAdmin={member.role === "admin"}
        // 🔥 点击 Filter 按钮 -> 打开 Search 弹窗
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* 🔥 这里删除了之前的 Input 输入框 */}

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
        {/* 🔥 直接渲染 channels，不再需要 filter */}
        {channels?.map((item) => (
          <SidebarItem
            key={item._id}
            label={item.name}
            icon={HashIcon}
            id={item._id}
            variant={item._id === channelId ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>

      <WorkspaceSection
        label="Direct Messages"
        hint="New direct message"
        // 点击加号也可以打开搜索弹窗，方便用户
        // onNew={() => setSearchOpen(true)}
      >
        {/* 🔥 直接渲染 members */}
        {members?.map((item) => (
          <UserItem
            key={item._id}
            id={item._id}
            label={item.user.name}
            image={item.user.image}
            variant={item._id === memberId ? "active" : "default"}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
};
