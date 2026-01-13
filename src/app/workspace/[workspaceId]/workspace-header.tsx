import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { ChevronDown, ListFilter, SquarePen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Doc } from "../../../../convex/_generated/dataModel";
import { PreferencesModal } from "./preferences-modal";
import { InviteModal } from "./invite-modal";
import { useState } from "react";

interface WorkspaceHeaderProps {
  workspace: Doc<"workspaces">;
  isAdmin: boolean;
  onSearchClick: () => void; // 🔥 只保留这一个回调
  // 🔥 1. 新增 isPhone 属性
  isPhone?: boolean;
}

export const WorkspaceHeader = ({
  workspace,
  isAdmin,
  onSearchClick,
  isPhone,
}: WorkspaceHeaderProps) => {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <InviteModal
        open={inviteOpen}
        setOpen={setInviteOpen}
        name={workspace.name}
        joinCode={workspace.joinCode}
      />
      <PreferencesModal
        open={preferencesOpen}
        setOpen={setPreferencesOpen}
        initialValue={workspace.name}
      />
      <div className="flex items-center justify-between px-1.5 h-[49px] gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="transparent"
              className="font-semibold text-base p-1.5 overflow-hidden shrink min-w-0"
              size="sm"
            >
              <span className="truncate">{workspace.name}</span>
              <ChevronDown className="size-4 ml-1 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-64">
            <DropdownMenuItem className="cursor-pointer capitalize">
              <div className="size-9 relative overflow-hidden bg-[#616161] text-white font-semibold text-xl rounded-md flex items-center justify-center mr-2 shrink-0">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <p className="font-bold truncate w-full">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">
                  Active workspace
                </p>
              </div>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => setInviteOpen(true)}
                >
                  Invite people to this workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => setPreferencesOpen(true)}
                >
                  Preferences
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5">
          {/* 🔥 只保留这个 Filter 按钮，但功能是打开 Search */}
          {!isPhone && (
            <Hint label="Filter" side="bottom">
              <Button
                variant="transparent"
                size="iconSm"
                onClick={onSearchClick}
              >
                <ListFilter className="size-4" />
              </Button>
            </Hint>
          )}

          {/* SquarePen 按钮已删除 */}
        </div>
      </div>
    </>
  );
};
