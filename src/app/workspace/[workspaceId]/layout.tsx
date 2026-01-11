"use client";

import { useEffect } from "react";
import { Toolbar } from "./toolbar";
import { Sidebar } from "./sidebar";
import { WorkspaceSidebar } from "./workspace-sidebar";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { usePanel } from "@/hooks/use-panel";
import { Loader } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Thread } from "@/features/messages/components/thread";
import { Profile } from "@/features/members/components/profile";

import { useRouter } from "next/navigation"; // 🔥 新增
import { useWorkspaceId } from "@/hooks/use-workspace-id"; // 🔥 新增
import { useCurrentMember } from "@/features/members/api/use-current-member"; // 🔥 新增

interface WorkspaceIdLayoutProps {
  children: React.ReactNode;
}

const WorkspaceIdLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { parentMessageId, profileMemberId, onCloseMessage } = usePanel();
  // 🔥 核心逻辑：获取当前成员身份
  const { data: member, isLoading: memberLoading } = useCurrentMember({
    workspaceId,
  });
  const showPanel = !!parentMessageId || !!profileMemberId;
  // 🔥 核心逻辑：受害者自动跳转
  // 如果加载完成了，但找不到 member 信息，说明被移除了 -> 踢回首页
  useEffect(() => {
    if (!memberLoading && !member) {
      router.push("/");
    }
  }, [memberLoading, member, router]);

  // 如果正在加载，或者是被移除状态（正在等待跳转），显示 Loading 遮罩
  // 这样用户就看不到那个紫色的错误页面了
  if (memberLoading || !member) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="h-full">
      <Toolbar />
      <div className="flex h-[calc(100vh-52px)]">
        <Sidebar />
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="felix-workspace-layout"
        >
          <ResizablePanel
            defaultSize={20}
            minSize={20}
            className="bg-[#8364bd]"
          >
            <WorkspaceSidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize={20} defaultSize={80}>
            {children}
          </ResizablePanel>
          {showPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel minSize={20} defaultSize={29}>
                {parentMessageId ? (
                  <Thread
                    messageId={parentMessageId as Id<"messages">}
                    onCloseMessage={onCloseMessage}
                  />
                ) : profileMemberId ? (
                  <Profile
                    memberId={profileMemberId as Id<"members">}
                    onClose={onCloseMessage} // 这里之前笔误了，也懒得改了
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Loader className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default WorkspaceIdLayout;
