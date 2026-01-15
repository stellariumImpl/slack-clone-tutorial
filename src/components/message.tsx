"use client";

import { Doc, Id } from "../../convex/_generated/dataModel";
import { Hint } from "./hint";
import { ImagesGrid } from "./thumbnail";
import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { MessageToolbar } from "./message-toolbar";
import { useUpdateMessage } from "@/features/messages/api/use-update-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRemoveMessage } from "@/features/messages/api/use-remove-message";
import { useConfirm } from "@/hooks/use-confirm";
import { useToggleReaction } from "@/features/reactions/api/use-toggle-reaction";
import { Reactions } from "./reactions";
import { usePanel } from "@/hooks/use-panel";
import { ThreadBar } from "./thread-bar";
// 1. 引入图标
import { Phone, PhoneOff } from "lucide-react";

const Renderer = dynamic(() => import("@/components/renderer"), { ssr: false });
const Editor = dynamic(() => import("@/components/editor"), { ssr: false });

interface MessageProps {
  id: Id<"messages">;
  memberId: Id<"members">;
  authorImage?: string;
  authorName?: string;
  isAuthor: boolean;
  reactions: Array<
    Omit<Doc<"reactions">, "memberId"> & {
      count: number;
      memberIds: Id<"members">[];
    }
  >;
  body: Doc<"messages">["body"];
  images: string[];
  updatedAt: Doc<"messages">["updatedAt"];
  createdAt: Doc<"messages">["_creationTime"];
  isEditing: boolean;
  setEditingId: (id: Id<"messages"> | null) => void;
  isCompact?: boolean;
  hideThreadButton?: boolean;
  threadCount?: number;
  threadImage?: string;
  threadName?: string;
  threadTimestamp?: number;

  // 2. 【新增】接收类型和时长
  type?: "text" | "call" | "call_join" | "call_leave";
  callDuration?: number;
}

const formatFullTime = (date: Date) => {
  return `${isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMM d, yyyy")} at ${format(date, "h:mm:ss a")}`;
};

// 辅助函数：格式化毫秒为 mm:ss
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

export const Message = ({
  id,
  memberId,
  authorImage,
  authorName = "Member",
  isAuthor,
  reactions,
  body,
  images,
  updatedAt,
  createdAt,
  isEditing,
  setEditingId,
  isCompact,
  hideThreadButton,
  threadCount,
  threadImage,
  threadName,
  threadTimestamp,
  type,
  callDuration,
}: MessageProps) => {
  const { parentMessageId, onOpenMessage, onCloseMessage, onOpenProfile } =
    usePanel();
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const handleOpenImage = (index: number) => {
    setInitialIndex(index);
    setIsImageOpen(true);
  };

  const { mutate: toggleReaction, isPending: isTogglingReaction } =
    useToggleReaction();
  const handleReaction = (value: string) => {
    toggleReaction(
      { messageId: id, value },
      { onError: () => toast.error("Failed to toggle reaction") }
    );
  };

  const { mutate: updateMessage, isPending: isUpdatingMessage } =
    useUpdateMessage();
  const isPending = isUpdatingMessage || isTogglingReaction;

  const handleUpdate = ({ body }: { body: string }) => {
    updateMessage(
      { id, body },
      {
        onSuccess: () => {
          toast.success("Message updated");
          setEditingId(null);
        },
        onError: () => toast.error("Failed to update message"),
      }
    );
  };

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete message",
    "Are you sure you want to delete this message?"
  );

  const { mutate: removeMessage, isPending: isRemovingMessage } =
    useRemoveMessage();

  const handleRemove = async () => {
    const ok = await confirm();
    if (!ok) return;
    removeMessage(
      { id },
      {
        onSuccess: () => {
          toast.success("Message removed");
          if (parentMessageId === id) onCloseMessage();
        },
        onError: () => toast.error("Failed to remove message"),
      }
    );
  };

  // 3. 判断是否为系统消息
  // 只要 type 是 "call"，或者 callDuration 存在，都算系统消息
  // 这样即使挂断后修改了 body，它依然被锁定
  const isSystemMessage = type === "call";

  // 4. 渲染通话卡片的组件
  const CallCard = () => {
    // 如果有 duration，说明通话已结束
    const isEnded = !!callDuration;

    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border w-fit max-w-[300px]",
          isEnded
            ? "bg-gray-50 border-gray-200 text-gray-600" // 结束样式
            : "bg-emerald-50 border-emerald-200 text-emerald-700" // 进行中样式
        )}
      >
        <div
          className={cn(
            "p-2 rounded-full",
            isEnded ? "bg-gray-200" : "bg-emerald-200"
          )}
        >
          {isEnded ? (
            <PhoneOff className="size-5" />
          ) : (
            <Phone className="size-5 animate-pulse" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">
            {isEnded ? "Video call ended" : "Join the video call"}
          </span>
          <span className="text-xs opacity-90">
            {isEnded
              ? `Duration: ${formatDuration(callDuration!)}`
              : "Click the video icon to join"}
          </span>
        </div>
      </div>
    );
  };

  const avatarFallback = authorName.charAt(0).toUpperCase();

  // ----------------------------------------------------------------------
  // 渲染逻辑开始
  // ----------------------------------------------------------------------

  if (isCompact) {
    return (
      <>
        <ConfirmDialog />
        <div
          className={cn(
            "flex flex-col gap-2 p-1.5 px-5 hover:bg-gray-100/60 group relative",
            isEditing && "bg-[#f2c74433] hover:bg-[#f2c74433]",
            isRemovingMessage &&
              "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
          )}
        >
          <div className="flex items-start gap-2">
            <Hint label={formatFullTime(new Date(createdAt))}>
              <button className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 w-[40px] leading-[22px] text-center hover:underline">
                {format(new Date(createdAt), "h:mm")}
              </button>
            </Hint>
            <div className="flex flex-col w-full">
              {isEditing ? (
                <div className="w-full h-full">
                  <Editor
                    onSubmit={handleUpdate}
                    disabled={isPending}
                    defaultValue={body}
                    onCancel={() => setEditingId(null)}
                    variant="update"
                  />
                </div>
              ) : (
                <>
                  {/* 5. 核心逻辑：如果是 Call 就渲染卡片，否则渲染文本 */}
                  {type === "call" ? <CallCard /> : <Renderer value={body} />}

                  {/* 通用部分 */}
                  <ImagesGrid images={images} onOpen={handleOpenImage} />
                  {updatedAt && type !== "call" && (
                    <span className="text-xs text-muted-foreground">
                      (edited)
                    </span>
                  )}
                  <Reactions data={reactions} onChange={handleReaction} />
                  <ThreadBar
                    count={threadCount}
                    image={threadImage}
                    name={threadName}
                    timestamp={threadTimestamp}
                    onClick={() => onOpenMessage(id)}
                  />
                </>
              )}
            </div>
          </div>
          {!isEditing && (
            <MessageToolbar
              isAuthor={isAuthor}
              isPending={false}
              handleEdit={() => setEditingId(id)}
              handleThread={() => onOpenMessage(id)}
              handleDelete={handleRemove}
              handleReaction={handleReaction}
              hideThreadButton={hideThreadButton}
              // 传入更准确的系统消息标记
              isSystemMessage={isSystemMessage}
            />
          )}
        </div>
      </>
    );
  }

  // 默认模式 (非 Compact)
  return (
    <>
      <ConfirmDialog />
      <div
        className={cn(
          "flex flex-col gap-2 p-1.5 px-5 hover:bg-gray-100/60 group relative",
          isEditing && "bg-[#f2c74433] hover:bg-[#f2c74433]",
          isRemovingMessage &&
            "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
        )}
      >
        <div className="flex items-start gap-2">
          <button onClick={() => onOpenProfile(memberId)}>
            <Avatar>
              <AvatarImage src={authorImage} />
              <AvatarFallback className="bg-sky-500 text-white text-xs">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </button>

          <div className="flex flex-col w-full overflow-hidden">
            <div className="text-sm">
              <button
                onClick={() => onOpenProfile(memberId)}
                className="font-bold text-primary hover:underline"
              >
                {authorName}
              </button>
              <span>&nbsp;&nbsp;</span>
              <Hint label={formatFullTime(new Date(createdAt))}>
                <button className="text-xs text-muted-foreground hover:underline">
                  {format(new Date(createdAt), "h:mm a")}
                </button>
              </Hint>
            </div>

            {isEditing ? (
              <div className="w-full h-full pt-2">
                <Editor
                  onSubmit={handleUpdate}
                  disabled={isPending}
                  defaultValue={body}
                  onCancel={() => setEditingId(null)}
                  variant="update"
                />
              </div>
            ) : (
              <>
                {/* 5. 核心逻辑：如果是 Call 就渲染卡片，否则渲染文本 */}
                {type === "call" ? <CallCard /> : <Renderer value={body} />}

                <ImagesGrid images={images} onOpen={handleOpenImage} />
                {updatedAt && type !== "call" && (
                  <span className="text-xs text-muted-foreground">
                    (edited)
                  </span>
                )}
                <Reactions data={reactions} onChange={handleReaction} />
                <ThreadBar
                  count={threadCount}
                  image={threadImage}
                  name={threadName}
                  timestamp={threadTimestamp}
                  onClick={() => onOpenMessage(id)}
                />
              </>
            )}
          </div>
        </div>

        {!isEditing && (
          <MessageToolbar
            isAuthor={isAuthor}
            isPending={isPending}
            handleEdit={() => setEditingId(id)}
            handleThread={() => onOpenMessage(id)}
            handleDelete={handleRemove}
            handleReaction={handleReaction}
            hideThreadButton={hideThreadButton}
            isSystemMessage={isSystemMessage}
          />
        )}
      </div>

      <Lightbox
        open={isImageOpen}
        close={() => setIsImageOpen(false)}
        index={initialIndex}
        slides={images.map((url) => ({ src: url }))}
      />
    </>
  );
};
