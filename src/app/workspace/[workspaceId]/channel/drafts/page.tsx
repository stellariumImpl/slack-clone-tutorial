"use client";

import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader2, TrashIcon, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

// 🔥 引入 Convex
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

import { cn } from "@/lib/utils";
// 引入 toast
import { toast } from "sonner";
// 🔥🔥 1. 引入自定义的 Confirm Hook
import { useConfirm } from "@/hooks/use-confirm";

// 工具函数：去除 HTML 标签
const stripHtml = (html: string) => {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const DraftsPage = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();

  // 🔥🔥 2. 初始化 ConfirmDialog
  const [ConfirmDialog, confirm] = useConfirm(
    "Delete Draft", // 标题
    "Are you sure you want to delete this draft? This action cannot be undone." // 内容
  );

  const drafts = useQuery(api.drafts.getDrafts, { workspaceId });
  const removeDraft = useMutation(api.drafts.remove);

  if (drafts === undefined) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-white/80" />
          <p className="text-white/80 font-bold text-lg tracking-wide">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const handleJump = (draft: any) => {
    if (!draft.targetId) return;

    if (draft.type === "channel") {
      router.push(`/workspace/${workspaceId}/channel/${draft.targetId}`);
    } else {
      router.push(`/workspace/${workspaceId}/member/${draft.targetId}`);
    }
  };

  // 🔥🔥 3. 修改删除逻辑为异步，并调用自定义 confirm
  const handleDelete = async (e: React.MouseEvent, draft: any) => {
    // 阻止冒泡，防止触发跳转
    e.stopPropagation();

    // 唤起自定义弹窗，等待用户选择
    const ok = await confirm();

    // 如果用户点击了 Confirm (ok 为 true)
    if (ok) {
      removeDraft({
        workspaceId,
        channelId: draft.channelId,
        parentMessageId: draft.parentMessageId,
        conversationId: draft.conversationId,
      })
        .then(() => {
          toast.success("Draft deleted");
        })
        .catch(() => {
          toast.error("Failed to delete draft");
        });
    }
  };

  return (
    // 🔥🔥 4. 记得把 ConfirmDialog 渲染出来，通常放在最外层 Fragment 里
    <>
      <ConfirmDialog />
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between px-4 h-[49px] border-b bg-white shrink-0">
          <span className="text-lg font-bold">Drafts</span>
        </div>

        <div className="flex-1 overflow-y-auto messages-scrollbar">
          {drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
              <p>No drafts found.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {drafts.map((draft: any) => (
                <div
                  key={draft._id}
                  onClick={() => handleJump(draft)}
                  className={cn(
                    "flex flex-col gap-2 p-1.5 px-5 hover:bg-gray-100/60 group relative cursor-pointer transition-colors"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-x-2">
                      <span className="font-bold text-sm text-[#1d1c1d] hover:underline cursor-pointer">
                        {draft.displayTitle || "Untitled"}
                      </span>

                      {draft.parentMessageId && (
                        <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">
                          Thread
                        </span>
                      )}
                    </div>

                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground group-hover:opacity-0 font-mono transition-opacity">
                        {formatTime(draft._creationTime)}
                      </span>

                      <div className="absolute right-5 flex items-center gap-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="size-6 flex items-center justify-center rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                          onClick={(e) => handleDelete(e, draft)}
                        >
                          <TrashIcon className="size-3.5" />
                        </button>

                        <ArrowRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="text-[15px] text-gray-600 line-clamp-2 break-all">
                    {stripHtml(draft.body)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DraftsPage;
