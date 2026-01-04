import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { CopyIcon, RefreshCcw } from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNewJoinCode } from "@/features/workspaces/api/use-new-join-code";
import { useEffect, useState } from "react";

interface InviteModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  name: string;
  joinCode: string;
}

export const InviteModal = ({
  open,
  setOpen,
  name,
  joinCode,
}: InviteModalProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useNewJoinCode();

  // 倒计时状态，默认30秒
  const [timeLeft, setTimeLeft] = useState(30);
  // 专门用于追踪“手动点击”的状态，以此来控制图标是否旋转
  const [isManualLoading, setIsManualLoading] = useState(false);

  // 新增：冷却状态，防止连点 (Rate Limiting State)
  const [isRateLimited, setIsRateLimited] = useState(false);

  // 核心逻辑：倒计时与自动刷新
  useEffect(() => {
    // 如果模态框没打开，就不跑定时器，节省性能
    if (!open) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 倒计时结束：触发自动更新
          // 注意：这里没有设置 isManualLoading，所以图标不会转
          mutate(
            { workspaceId },
            {
              onSuccess: () => {
                // 自动刷新成功，通常不需要弹 toast 打扰用户，或者可以弹一个很轻的
                // toast.success("Code auto-refreshed");
              },
            }
          );
          return 30; // 重置回 30 秒
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, workspaceId, mutate]); // 依赖项

  // 手动刷新处理函数
  const handleNewJoinCode = () => {
    // 新增：检查如果正在冷却中，直接返回，不执行后续逻辑
    if (isRateLimited) return;
    setIsManualLoading(true); // 1. 标记为手动加载，开始旋转

    // 新增：上锁，开启冷却
    setIsRateLimited(true);

    mutate(
      { workspaceId },
      {
        onSuccess: () => {
          toast.success("New join code generated");
          setTimeLeft(30); // 2. 手动刷新后，重置倒计时
        },
        onError: () => {
          toast.error("Failed to generate new join code");
        },
        onSettled: () => {
          setIsManualLoading(false); // 3. 结束旋转
          // 新增：解锁，10秒后才能再次点击
          setTimeout(() => {
            setIsRateLimited(false);
          }, 10000);
        },
      }
    );
  };

  const handleCopy = () => {
    const inviteLink = `${window.location.origin}/join/${workspaceId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast.success("Link copied to clipboard");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 bg-white overflow-hidden max-w-md gap-0 text-black">
        <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100">
          <DialogTitle className="font-bold text-lg">Invite People</DialogTitle>
          <DialogDescription className="text-gray-500">
            Use the code and link below to invite people to{" "}
            <span className="text-black font-semibold">{name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-y-6">
          <div className="px-5 py-4 bg-white rounded-lg border border-gray-200 flex flex-col gap-y-2">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-bold text-gray-900">Invite Code</p>
              <Button
                onClick={handleCopy}
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-[#5d33a8] hover:text-[#4a2885] hover:bg-transparent h-auto p-0"
              >
                Copy Link
                <CopyIcon className="size-4 ml-2" />
              </Button>
            </div>

            <p className="text-4xl font-bold tracking-widest uppercase text-black mt-2">
              {joinCode}
            </p>

            {/* 显示倒计时提示 */}
            <div className="flex items-center gap-x-2 mt-1">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-muted-foreground">
                Active for {timeLeft} seconds
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <Button
              // 新增：禁用条件，正在请求中 OR 正在冷却中
              disabled={isPending || isRateLimited}
              onClick={handleNewJoinCode}
              variant="outline"
              className="cursor-pointer border-gray-200 text-gray-600 hover:bg-gray-50 w-full"
            >
              {/* 新增：给用户一点文字反馈，告诉他为什么要等 */}
              {isRateLimited ? "Please wait..." : "New Code"}
              <RefreshCcw
                className={cn(
                  "size-4 ml-2",
                  // 只有在手动触发时 (isManualLoading) 才加 animate-spin
                  // 自动触发虽然也会导致 isPending 变 true，但 isManualLoading 还是 false
                  isManualLoading && "animate-spin"
                )}
              />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
