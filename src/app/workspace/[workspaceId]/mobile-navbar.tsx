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
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

// 🔥 修正：引用正确的全局搜索组件
import { Search } from "@/components/global-search";

export const MobileNavbar = () => {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // 控制搜索弹窗

  const pathname = usePathname();
  const workspaceId = useWorkspaceId();

  const { data: workspace } = useGetWorkspace({ id: workspaceId });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 渲染搜索弹窗 */}
      <Search open={searchOpen} setOpen={setSearchOpen} />

      <nav className="md:hidden border-b bg-[#5d33a8] px-4 h-[50px] flex items-center shadow-sm shrink-0 gap-x-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="transparent"
              className="text-white hover:bg-white/10 shrink-0"
            >
              <Menu className="size-5" />
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

        {/* 适配手机端的搜索条 */}
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
