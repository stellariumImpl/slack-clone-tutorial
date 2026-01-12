import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { CopyIcon, RefreshCcw, Check } from "lucide-react"; // 新增 Check 图标

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

  // === 原有逻辑保持不变 ===
  const [timeLeft, setTimeLeft] = useState(30);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(10);

  // === 新增：控制复制 Code 的成功状态 ===
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          mutate(
            { workspaceId },
            {
              onSuccess: () => {},
              onError: (error) => {
                if (
                  error.message !==
                  "You are doing that too fast. Please wait a moment."
                ) {
                  console.error("Auto update failed:", error);
                }
              },
            }
          );
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, workspaceId, mutate]);

  useEffect(() => {
    if (isRateLimited) {
      const timer = setInterval(() => {
        setCooldownTimer((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false);
            setClickCount(0);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isRateLimited]);

  useEffect(() => {
    if (clickCount > 0 && clickCount < 3 && !isRateLimited) {
      const timer = setTimeout(() => {
        setClickCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [clickCount, isRateLimited]);

  // === 新增：点击复制 Code 的处理函数 ===
  const handleCopyCode = () => {
    navigator.clipboard.writeText(joinCode).then(() => {
      setIsCopied(true);
      toast.success("Invite code copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000); // 2秒后重置状态
    });
  };

  const handleNewJoinCode = () => {
    if (isRateLimited) return;

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 3) {
      setIsRateLimited(true);
      setCooldownTimer(10);
      toast.error("You are doing that too fast. Please wait 10s.");
    }

    setIsManualLoading(true);
    mutate(
      { workspaceId },
      {
        onSuccess: () => {
          toast.success("New join code generated");
          setTimeLeft(30);
        },
        onError: () => {
          toast.error("Failed to generate new join code");
        },
        onSettled: () => {
          setIsManualLoading(false);
        },
      }
    );
  };

  const handleCopyLink = () => {
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
            <span className="text-black font-semibold inline-block max-w-[100px] align-bottom truncate">
              {name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-y-6">
          {/* 原有卡片结构保持完全一致，仅修改中间文字部分 */}
          <div className="px-5 py-4 bg-white rounded-lg border border-gray-200 flex flex-col gap-y-2">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-bold text-gray-900">Invite Code</p>
              {/* 这里是复制链接，保持原样 */}
              <Button
                onClick={handleCopyLink}
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-[#5d33a8] hover:text-[#4a2885] hover:bg-transparent h-auto p-0"
              >
                Copy Link
                <CopyIcon className="size-4 ml-2" />
              </Button>
            </div>

            {/* === 修改开始：局部增强 Invite Code 显示区域 === */}
            <div
              onClick={handleCopyCode}
              className="flex items-center gap-x-2 mt-2 cursor-pointer group"
              title="Click to copy code"
            >
              {/* 创意点：
                 1. transition-colors: 颜色平滑过渡
                 2. group-hover: 鼠标放上去时略微变色提示可点击
                 3. active:scale-95: 点击时的按压反馈
              */}
              <p
                className={cn(
                  "text-4xl font-bold tracking-widest uppercase transition-all duration-300",
                  isCopied
                    ? "text-green-600 scale-105" // 成功状态：绿色 + 轻微放大
                    : "text-black group-hover:text-gray-500 group-active:scale-95" // 普通交互：灰色提示 + 按压缩小
                )}
              >
                {joinCode}
              </p>

              {/* 创意点：状态图标
                 平时隐藏 (opacity-0)，Hover时显示 Copy 图标，
                 复制成功后变为 Check 图标并旋转进入
              */}
              <div className="size-6 relative ml-1">
                {isCopied ? (
                  <Check className="size-5 absolute top-1 left-0 text-green-600 animate-in fade-in zoom-in spin-in-90 duration-300" />
                ) : (
                  <CopyIcon className="size-5 absolute top-1 left-0 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </div>
            </div>
            {/* === 修改结束 === */}

            <div className="flex items-center gap-x-2 mt-1">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-muted-foreground">
                Active for {timeLeft} seconds
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <Button
              disabled={isPending || isRateLimited}
              onClick={handleNewJoinCode}
              variant="outline"
              className="cursor-pointer border-gray-200 text-gray-600 hover:bg-gray-50 w-full"
            >
              {isRateLimited ? `Wait ${cooldownTimer}s` : "New Code"}

              {!isRateLimited && (
                <RefreshCcw
                  className={cn(
                    "size-4 ml-2",
                    isManualLoading && "animate-spin"
                  )}
                />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
