"use client";

import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader2, TrashIcon, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";

// 去除 HTML
const stripHtml = (html: string) => {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

// 时间格式
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

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete Draft",
    "Are you sure you want to delete this draft? This action cannot be undone."
  );

  const drafts = useQuery(api.drafts.getDrafts, { workspaceId });
  const removeDraft = useMutation(api.drafts.remove);

  if (drafts === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-[#5d33a8]">
        <Loader2 className="size-8 animate-spin text-white/80" />
      </div>
    );
  }

  const handleJump = (draft: any) => {
    if (!draft.targetId) return;

    let path =
      draft.type === "channel"
        ? `/workspace/${workspaceId}/channel/${draft.targetId}`
        : `/workspace/${workspaceId}/member/${draft.targetId}`;

    if (draft.parentMessageId) {
      path += `?parentMessageId=${draft.parentMessageId}`;
    }

    router.push(path);
  };

  const handleDelete = async (e: React.MouseEvent, draft: any) => {
    e.stopPropagation();
    const ok = await confirm();

    if (!ok) return;

    removeDraft({
      workspaceId,
      channelId: draft.channelId,
      parentMessageId: draft.parentMessageId,
      conversationId: draft.conversationId,
    })
      .then(() => toast.success("Draft deleted"))
      .catch(() => toast.error("Failed to delete draft"));
  };

  return (
    <>
      <ConfirmDialog />

      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center px-4 h-[49px] border-b shrink-0">
          <span className="text-lg font-bold">Drafts</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto messages-scrollbar">
          {drafts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No drafts found.
            </div>
          ) : (
            <div className="flex flex-col">
              {drafts.map((draft: any) => (
                <div
                  key={draft._id}
                  onClick={() => handleJump(draft)}
                  className={cn(
                    "group relative cursor-pointer",
                    "hover:bg-gray-100/60 transition-colors",
                    // 左侧 Hover 引导线
                    "before:absolute before:left-0 before:top-0 before:h-full before:w-[2px]"
                    // "before:bg-transparent hover:before:bg-purple-500"
                  )}
                >
                  <div className="flex gap-x-3 px-5 py-2">
                    {/* 左侧 Icon 锚点 */}
                    <div className="shrink-0 pt-0.5">
                      <div
                        className={cn(
                          "size-8 rounded-md flex items-center justify-center",
                          "text-xs font-bold select-none",
                          draft.parentMessageId
                            ? "bg-sky-100 text-sky-700"
                            : draft.type === "channel"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                        )}
                      >
                        {draft.parentMessageId
                          ? "&"
                          : draft.type === "channel"
                            ? "#"
                            : "@"}
                      </div>
                    </div>

                    {/* 主体内容 */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-x-2 min-w-0">
                          <span className="font-bold text-sm truncate">
                            {draft.displayTitle || "Untitled"}
                          </span>

                          {/* {draft.parentMessageId && (
                            <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">
                              Thread
                            </span>
                          )} */}
                        </div>

                        {/* 右侧时间 / 操作 */}
                        <div className="flex items-center">
                          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground group-hover:opacity-0 font-mono transition-opacity">
                            {formatTime(draft._creationTime)}
                          </span>

                          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

                      <div className="text-[14px] text-gray-600 line-clamp-2 break-all">
                        {stripHtml(draft.body)}
                      </div>
                    </div>
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
