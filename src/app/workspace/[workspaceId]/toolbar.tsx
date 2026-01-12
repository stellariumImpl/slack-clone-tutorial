"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Info, Search as SearchIcon } from "lucide-react";

// 🔥 引入我们做好的全局搜索组件
import { Search } from "@/components/global-search";

export const Toolbar = () => {
  const workspaceId = useWorkspaceId();
  const { data } = useGetWorkspace({ id: workspaceId });

  // 控制搜索弹窗状态
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 搜索弹窗 (功能保留) */}
      <Search open={open} setOpen={setOpen} />

      {/* 🔥 UI 恢复：回到你原来的 h-12 (48px) 高度，更宽敞 */}
      <nav className="bg-[#5d33a8] flex items-center justify-between h-13 p-1.5 border-b border-white/10">
        <div className="flex-1" />

        <div className="min-w-0 w-full max-w-[540px] grow shrink px-2">
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            // 🔥 UI 恢复：高度改回 h-9 (36px)，字体改回 text-sm (14px)
            className="bg-accent/25 hover:bg-accent/25 w-full justify-start h-9 px-2"
          >
            <SearchIcon className="size-4 text-white mr-2" />
            <span className="text-white text-sm truncate">
              Search {data?.name}
            </span>
          </Button>
        </div>

        <div className="ml-auto flex-1 flex items-center justify-end">
          <Button
            variant="transparent"
            size="iconSm"
            onClick={() => {
              // 这里的逻辑通常是：setOpenPanel("channel-info")
              alert("频道详情面板 (Channel Details) 尚未开发 🚧");
            }}
          >
            <Info className="size-5 text-white" />
          </Button>
        </div>
      </nav>
    </>
  );
};
