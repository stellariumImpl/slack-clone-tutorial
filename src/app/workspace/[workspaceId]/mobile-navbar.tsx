"use client";

import { Menu, Search as SearchIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

// 🔥 1. 引入获取数据的 Hooks
import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useGetMembers } from "@/features/members/api/use-get-members";

import { Search } from "@/components/global-search";

export const MobileNavbar = () => {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const pathname = usePathname();
  const workspaceId = useWorkspaceId();

  const { data: workspace } = useGetWorkspace({ id: workspaceId });

  // 🔥 2. 获取频道和成员列表
  // 这里的查询非常快，因为 Convex 客户端有缓存，不会造成额外的网络负担
  const { data: channels } = useGetChannels({ workspaceId });
  const { data: members } = useGetMembers({ workspaceId });

  // 🔥 3. 计算是否有未读消息
  // 只要任意一个频道或者成员有 hasAlert，就显示红点
  const hasAlert = useMemo(() => {
    const hasChannelAlert = channels?.some((channel) => channel.hasAlert);
    const hasMemberAlert = members?.some((member) => member.hasAlert);
    return hasChannelAlert || hasMemberAlert;
  }, [channels, members]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <Search open={searchOpen} setOpen={setSearchOpen} />

      <nav className="md:hidden border-b bg-[#5d33a8] px-4 h-[50px] flex items-center shadow-sm shrink-0 gap-x-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="transparent"
              className="text-white hover:bg-white/10 shrink-0 relative" // 🔥 加上 relative 以便定位红点
            >
              <Menu className="size-5" />

              {/* 🔥 4. 如果有未读消息，在汉堡菜单上显示红点 */}
              {hasAlert && (
                <div className="absolute top-2.5 right-2.5 size-2.5 bg-rose-500 rounded-full border-2 border-[#5d33a8]" />
              )}
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="p-0 flex flex-row gap-0 w-[320px] h-[100vh] bg-[#5d33a8] border-none [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Mobile navigation sidebar
            </SheetDescription>

            <div className="w-[60px] shrink-0 h-full">
              <Sidebar />
            </div>

            <div className="h-full flex-1 overflow-y-auto min-w-0">
              <WorkspaceSidebar isPhone />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 min-w-0">
          <Button
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="bg-accent/25 hover:bg-accent/25 w-full justify-start h-9 px-2 text-white/90"
          >
            <SearchIcon className="size-4 text-white mr-2" />
            <span className="text-white text-sm truncate">
              Search {workspace?.name || "Workspace"}
            </span>
          </Button>
        </div>
      </nav>
    </>
  );
};
