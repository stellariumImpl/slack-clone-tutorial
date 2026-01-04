import { Button } from "@/components/ui/button";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Info, Search } from "lucide-react";

export const Toolbar = () => {
  const workspaceId = useWorkspaceId();
  const { data } = useGetWorkspace({ id: workspaceId });
  return (
    <div>
      <nav className="bg-[#5d33a8] flex items-center justify-between h-13 p-1.5 border-b border-white/10">
        <div className="flex-1" />
        <div className="min-w-0 w-full max-w-[640px] grow shrink px-2">
          <Button
            size="sm"
            className="bg-accent/25 hover:bg-accent-25 w-full justify-start h-8.5 px-2"
          >
            <Search className="size-4 text-white mr-2" />
            {/* 去掉了 text-xs，文字变大；使用了 truncate 防止文字溢出 */}
            <span className="text-white text-sm truncate">
              Search {data?.name}
            </span>
          </Button>
        </div>

        <div className="ml-auto flex-1 flex items-center justify-end">
          <Button
            variant="transparent"
            size="iconSm"
            className="text-white/70 hover:text-white hover:bg-accent/20"
          >
            <Info className="size-6" />
          </Button>
        </div>
      </nav>
    </div>
  );
};
