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

import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { MobileNavbar } from "./mobile-navbar";

interface WorkspaceIdLayoutProps {
  children: React.ReactNode;
}

const WorkspaceIdLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { parentMessageId, profileMemberId, onCloseMessage } = usePanel();
  const { data: member, isLoading: memberLoading } = useCurrentMember({
    workspaceId,
  });
  const showPanel = !!parentMessageId || !!profileMemberId;

  useEffect(() => {
    if (!memberLoading && !member) {
      router.push("/");
    }
  }, [memberLoading, member, router]);

  if (memberLoading || !member) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    // 🔥 修改 1: 使用 100dvh (动态视口高度) 解决手机地址栏问题
    // overflow-hidden 禁止出现 body 级别的滚动条
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* 顶部导航区域：它们有固定高度，不用动 */}
      <MobileNavbar />
      <div className="hidden md:block">
        <Toolbar />
      </div>

      {/* 🔥 修改 2: 使用 flex-1 自动填满剩余空间 */}
      {/* min-h-0 是 Flex 布局中让内部滚动条生效的关键 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex h-full w-[60px] shrink-0 flex-col">
          <Sidebar />
        </div>

        {/* 桌面端 Resizable 面板 */}
        <div className="hidden md:flex h-full w-full">
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
              {/* children 容器通常不需要再 flex-1，因为 Panel 会控制大小 */}
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
                      onClose={onCloseMessage}
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

        {/* 手机端布局 */}
        <div className="md:hidden flex-1 flex flex-col h-full overflow-hidden w-full">
          {showPanel ? (
            <div className="h-full w-full absolute inset-0 z-50 bg-white">
              {parentMessageId ? (
                <Thread
                  messageId={parentMessageId as Id<"messages">}
                  onCloseMessage={onCloseMessage}
                />
              ) : profileMemberId ? (
                <Profile
                  memberId={profileMemberId as Id<"members">}
                  onClose={onCloseMessage}
                />
              ) : null}
            </div>
          ) : (
            // children (主聊天区)
            children
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceIdLayout;
