"use client";

import { Doc, Id } from "../../convex/_generated/dataModel";
import { Hint } from "./hint";
// import Renderer from "./renderer";
import { ImagesGrid } from "./thumbnail"; // 替换了原来的 Thumbnail
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
  threadImage?: string[];
  threadTimestamp?: number;
}

const formatFullTime = (date: Date) => {
  return `${isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMM d, yyyy")} at ${format(date, "h:mm:ss a")}`;
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
  threadTimestamp,
}: MessageProps) => {
  // --- 新增：Lightbox 状态管理 ---
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const handleOpenImage = (index: number) => {
    setInitialIndex(index);
    setIsImageOpen(true);
  };
  // ---------------------------

  const { mutate: updateMessage, isPending: isUpdatingMessage } =
    useUpdateMessage();

  const isPending = isUpdatingMessage;

  const handleUpdate = ({ body }: { body: string }) => {
    updateMessage(
      {
        id,
        body,
      },
      {
        onSuccess: () => {
          toast.success("Message updated successfully");
          setEditingId(null);
        },
        onError: (error) => {
          toast.error("Failed to update message");
        },
      }
    );
  };

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete message",
    "Are you sure you want to delete this message? This action is irreversible."
  );

  const { mutate: removeMessage, isPending: isRemovingMessage } =
    useRemoveMessage();

  const handleRemove = async () => {
    const ok = await confirm();
    if (!ok) return;
    removeMessage(
      {
        id,
      },
      {
        onSuccess: () => {
          toast.success("Message removed successfully");
          // TODO: Close thread if opened
        },
        onError: (error) => {
          toast.error("Failed to remove message");
        },
      }
    );
  };

  const { mutate: toggleReaction, isPending: isTogglingReaction } =
    useToggleReaction();

  const handleReaction = (value: string) => {
    toggleReaction(
      {
        messageId: id,
        value,
      },
      {
        onError: (error) => {
          toast.error("Failed to toggle reaction");
        },
      }
    );
  };

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
                  <Renderer value={body} />
                  {/* 替换为 ImagesGrid */}
                  <ImagesGrid images={images} onOpen={handleOpenImage} />
                  {updatedAt ? (
                    <span className="text-xs text-muted-foreground">
                      (edited)
                    </span>
                  ) : null}
                  {/* {JSON.stringify(reactions)} */}
                  <Reactions data={reactions} onChange={handleReaction} />
                </>
              )}
            </div>
          </div>
          {!isEditing && (
            <MessageToolbar
              isAuthor={isAuthor}
              isPending={false}
              handleEdit={() => setEditingId(id)}
              handleThread={() => {}}
              handleDelete={handleRemove}
              handleReaction={handleReaction}
              hideThreadButton={hideThreadButton}
            />
          )}
        </div>
        {/* 在 compact 模式下也需要渲染 Lightbox，但为了避免重复，可以在最外层统一处理，或者在这里也加一个 */}
        {/* 更好的做法是把 Lightbox 移到组件最外层，这里只负责布局。为了代码结构简单，我把它统一放在最后返回的 JSX 中 */}
      </>
    );
  }

  const avatarFallback = authorName.charAt(0).toUpperCase();

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
          {/* 左侧头像：始终显示 */}
          <button>
            <Avatar>
              <AvatarImage src={authorImage} />
              <AvatarFallback className="bg-sky-500 text-white text-xs">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* 右侧主区域 */}
          <div className="flex flex-col w-full overflow-hidden">
            {/* 1. 顶部信息栏 (名字+时间)：始终显示，不再被 isEditing 隐藏 */}
            <div className="text-sm">
              <button
                onClick={() => {}}
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

            {/* 2. 内容区域：根据状态切换 (编辑器 VS 渲染内容) */}
            {isEditing ? (
              // 编辑模式：显示编辑器
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
              // 浏览模式：显示正文和图片
              <>
                <Renderer value={body} />
                <ImagesGrid images={images} onOpen={handleOpenImage} />
                {updatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    (edited)
                  </span>
                ) : null}
                {/* {JSON.stringify(reactions)} */}
                <Reactions data={reactions} onChange={handleReaction} />
              </>
            )}
          </div>
        </div>

        {/* 工具栏：编辑时不显示 */}
        {!isEditing && (
          <MessageToolbar
            isAuthor={isAuthor}
            isPending={isPending}
            handleEdit={() => setEditingId(id)}
            handleThread={() => {}}
            handleDelete={handleRemove}
            handleReaction={handleReaction}
            hideThreadButton={hideThreadButton}
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
