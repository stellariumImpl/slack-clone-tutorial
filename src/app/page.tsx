"use client";

import { UserButton } from "@/features/auth/components/user-button";
import { useCreateWorkspaceModal } from "@/features/workspaces/store/use-create-workspace-modal";

import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const [open, setOpen] = useCreateWorkspaceModal();

  const { data, isLoading } = useGetWorkspaces();

  const workspaceId = useMemo(() => data?.[0]?._id, [data]);

  useEffect(() => {
    if (isLoading) return;

    if (workspaceId) {
      // console.log("redirect to workspace");
      router.replace(`/workspace/${workspaceId}`);
    } else if (!open) {
      setOpen(true);
    }
  }, [workspaceId, isLoading, open, setOpen]);

  return (
    // 修改重点：
    // 1. h-full: 铺满全屏
    // 2. bg-[#5d33a8]: 使用你的主题深紫色
    // 3. flex + justify-center: 内容居中
    <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
      {/* 中间的加载/欢迎元素 */}
      <div className="flex flex-col items-center gap-4">
        {/* 只有在 isLoading 时转圈，或者一直转圈作为装饰也可以 */}
        <Loader2 className="size-10 text-white animate-spin text-muted-foreground/50" />

        <p className="text-white font-bold text-lg tracking-wide opacity-80">
          Setting up your workspace...
        </p>
      </div>
    </div>
  );
}
