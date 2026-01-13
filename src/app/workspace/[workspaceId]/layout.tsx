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

// 🗑️ 删除引用
// import { IncomingCallListener } from "@/components/incoming-call-listener";

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
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* 🗑️ 删除组件调用 */}
      {/* <IncomingCallListener /> */}

      <MobileNavbar />
      <div className="hidden md:block">
        <Toolbar />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden md:flex h-full w-[60px] shrink-0 flex-col">
          <Sidebar />
        </div>

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
              {children}
            </ResizablePanel>
            {showPanel && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel minSize={30} defaultSize={40}>
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
            children
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceIdLayout;
