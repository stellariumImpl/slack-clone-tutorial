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

  // 1. 自动刷新倒计时 (30s)
  const [timeLeft, setTimeLeft] = useState(30);
  // 2. 控制图标旋转
  const [isManualLoading, setIsManualLoading] = useState(false);

  // 3. 点击次数计数
  const [clickCount, setClickCount] = useState(0);
  // 4. 是否触发了“冷却惩罚”
  const [isRateLimited, setIsRateLimited] = useState(false);
  // 5. 新增：惩罚倒计时 (默认10秒)
  const [cooldownTimer, setCooldownTimer] = useState(10);

  // ------------------------------------------------------------
  // 逻辑 A: 自动刷新 (Authenticator 模式)
  // ------------------------------------------------------------
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
                // 忽略 Too fast 错误
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

  // ------------------------------------------------------------
  // 逻辑 B: 冷却惩罚倒计时 (动态 10s -> 0s)
  // ------------------------------------------------------------
  useEffect(() => {
    // 只有在触发限制时才运行这个计时器
    if (isRateLimited) {
      const timer = setInterval(() => {
        setCooldownTimer((prev) => {
          if (prev <= 1) {
            // 倒计时结束：解除锁定，重置状态
            setIsRateLimited(false);
            setClickCount(0);
            return 10; // 重置回 10 供下次使用
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isRateLimited]);

  // ------------------------------------------------------------
  // 逻辑 C: 3秒无操作自动清除点击次数
  // ------------------------------------------------------------
  useEffect(() => {
    if (clickCount > 0 && clickCount < 3 && !isRateLimited) {
      const timer = setTimeout(() => {
        setClickCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [clickCount, isRateLimited]);

  const handleNewJoinCode = () => {
    if (isRateLimited) return;

    const newCount = clickCount + 1;
    setClickCount(newCount);

    // 触发惩罚
    if (newCount >= 3) {
      setIsRateLimited(true);
      setCooldownTimer(10); // 确保从 10 开始倒数
      toast.error("You are doing that too fast. Please wait 10s.");
      // 注意：这里不再需要 setTimeout，上面的 useEffect 会负责倒计时和解锁
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
            <span className="text-black font-semibold inline-block max-w-[100px] align-bottom truncate">
              {name}
            </span>
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
              {/* 动态显示 cooldownTimer */}
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
