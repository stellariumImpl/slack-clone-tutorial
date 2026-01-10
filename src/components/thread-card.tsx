import { formatDistanceToNow } from "date-fns";
import { MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Id } from "../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// 1. 引入 ImagesGrid (注意路径，如果你的组件在 src/components 下)
import { ImagesGrid } from "@/components/thumbnail";

const Renderer = dynamic(() => import("@/components/renderer"), { ssr: false });

interface ThreadCardProps {
  messageId: Id<"messages">;
  body: string;
  // 2. 改为接收图片数组
  images?: string[] | null;
  updatedAt: number;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
  channelId?: Id<"channels">;
  channelName?: string;
  replyCount?: number;
}

export const ThreadCard = ({
  messageId,
  body,
  images, // 接收数组
  updatedAt,
  createdAt,
  authorName = "Member",
  authorImage,
  channelId,
  channelName,
  replyCount,
}: ThreadCardProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const handleOpenThread = () => {
    if (!channelId) return;
    router.push(
      `/workspace/${workspaceId}/channel/${channelId}?parentMessageId=${messageId}`
    );
  };

  const avatarFallback = authorName.charAt(0).toUpperCase();

  return (
    <div
      onClick={handleOpenThread}
      className="flex flex-col gap-2 p-1.5 px-5 hover:bg-gray-100/60 group relative cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm hover:underline text-primary truncate max-w-[200px]">
            #{channelName || "unknown-channel"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          View thread
        </span>
        <span className="text-xs text-muted-foreground opacity-100 group-hover:opacity-0 transition-opacity absolute right-5">
          Last reply {formatDistanceToNow(updatedAt, { addSuffix: true })}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <button>
          <Avatar className="size-8 rounded-md mt-0.5">
            <AvatarImage src={authorImage} />
            <AvatarFallback className="rounded-md bg-sky-500 text-white text-xs">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </button>

        <div className="flex flex-col overflow-hidden w-full">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          </div>

          <div className="text-sm text-[#1d1c1d] w-full overflow-hidden max-h-24 relative">
            <Renderer value={body} />
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-transparent to-transparent group-hover:from-transparent/0" />
          </div>

          {/* 3. 使用 ImagesGrid 替代原来的 img 标签 */}
          {/* 这里传入空函数 onOpen，因为在 Thread 列表里点击图片通常期望是直接跳转到帖子，而不是弹窗查看大图 */}
          <ImagesGrid images={images} onOpen={() => {}} />

          {replyCount && replyCount > 0 && (
            <div className="flex items-center gap-1 mt-2 text-sky-600 hover:bg-white/50 w-fit p-1 rounded-sm -ml-1 transition">
              <MessageSquareText className="size-3.5" />
              <span className="text-xs font-medium">{replyCount} replies</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
