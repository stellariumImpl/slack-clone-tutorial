import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { XIcon, Loader, AlertTriangle } from "lucide-react";

import { useGetMessage } from "../api/use-get-message";
import { Message } from "@/components/message";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import dynamic from "next/dynamic";
import { useCreateMessage } from "@/features/messages/api/use-create-messages";
import { useGenerateUploadUrl } from "@/features/upload/api/use-generate-upload-url";
import { useChannelId } from "@/hooks/use-channel-id";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { useGetMessages } from "../api/use-get-messages";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";

const TIME_THRESHOLD = 5;

const Editor = dynamic(() => import("@/components/editor"), { ssr: false });

const formatDateLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "EEEE, MMMM d");
};

interface ThreadProps {
  messageId: Id<"messages">;
  onCloseMessage: () => void;
}

type CreateMessageValues = {
  channelId: Id<"channels">;
  workspaceId: Id<"workspaces">;
  parentMessageId: Id<"messages">;
  body: string;
  images: Id<"_storage">[];
};

export const Thread = ({ messageId, onCloseMessage }: ThreadProps) => {
  const channelId = useChannelId();
  const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);

  const workspaceId = useWorkspaceId();
  const { data: currentMember } = useCurrentMember({ workspaceId });

  const { data: message, isLoading: loadingMessage } = useGetMessage({
    id: messageId,
  });

  // -------- 粘帖自 chat-input ------------

  // 1. editorKey: 用来“刷新”编辑器的。
  // 当 key 变化时，React 会重新创建组件，从而清空输入框内容。
  const [editorKey, setEditorKey] = useState(0);

  // 2. isPending: 用来控制“正在发送”的状态。
  // 发送时变为 true，编辑器会变灰（不可用）。
  const [isPending, setIsPending] = useState(false);

  const { mutate: createMessage } = useCreateMessage();
  const { mutate: generateUploadUrl } = useGenerateUploadUrl();

  const { results, status, loadMore } = useGetMessages({
    channelId,
    parentMessageId: messageId,
  });

  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  const handleSubmit = async ({
    body,
    images,
  }: {
    body: string;
    images: File[];
  }) => {
    // console.log({ body, images });
    try {
      setIsPending(true);

      const values: CreateMessageValues = {
        channelId,
        workspaceId,
        parentMessageId: messageId,
        body,
        images: [],
      };

      // 2. 如果有图片，并发上传它们
      if (images && images.length > 0) {
        // 使用 map + Promise.all 并发处理每一张图片
        const uploadPromises = images.map(async (image) => {
          console.log(`压缩前: ${image.name} - ${image.size / 1024 / 1024} MB`);

          const compressedFile = await imageCompression(image, {
            maxSizeMB: 1, // 限制最大 1MB
            maxWidthOrHeight: 1920, // 限制最大宽/高 1920px
            useWebWorker: true, // 开启多线程处理，避免卡顿
          });

          console.log(`压缩后: ${compressedFile.size / 1024 / 1024} MB`);

          // A. 为每一张图请求一个独立的上传 URL
          const url = await generateUploadUrl({}, { throwError: true });

          if (!url) {
            throw new Error("Failed to generate upload URL");
          }

          // B. 上传当前这张 image (注意这里用的是 image.type，不是 images.type)
          const result = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": compressedFile.type,
            },
            body: compressedFile,
          });

          if (!result.ok) {
            throw new Error("Failed to upload image");
          }

          // C. 获取并返回 storageId
          const { storageId } = await result.json();
          return storageId;
        });

        // 等待所有图片上传完成，拿到 ID 数组
        const uploadedIds = await Promise.all(uploadPromises);

        // 3. 把拿到的 ID 数组赋值给 values
        values.images = uploadedIds;
      }

      // 4. 发送消息 (使用准备好的 values)
      await createMessage(values, { throwError: true });

      setEditorKey((prevKey) => prevKey + 1);
    } catch (error) {
      //   console.log(error);
      toast.error("Failed to send message");
    } finally {
      setIsPending(false);
    }
  };

  const groupedMessages = results?.reduce(
    (groups, message) => {
      const date = new Date(message._creationTime);
      const dateKey = format(date, "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].unshift(message);
      return groups;
    },
    {} as Record<string, typeof results>
  );

  if (loadingMessage || status === "LoadingFirstPage") {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[52.5px] px-4 border-b">
          <p className="text-lg font-bold">Thread</p>
          <Button onClick={onCloseMessage} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5]"></XIcon>
          </Button>
        </div>
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b">
          <p className="text-lg font-bold">Thread</p>
          <Button onClick={onCloseMessage} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5]"></XIcon>
          </Button>
        </div>
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <AlertTriangle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Message not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center h-[49px] px-4 border-b">
        <p className="text-lg font-bold">Thread</p>
        <Button onClick={onCloseMessage} size="iconSm" variant="ghost">
          <XIcon className="size-5 stroke-[1.5]"></XIcon>
        </Button>
      </div>
      <div className="flex-1 flex flex-col-reverse pb-4 overflow-y-auto messages-scrollbar">
        {Object.entries(groupedMessages || {}).map(([dateKey, messages]) => (
          <div key={dateKey}>
            <div className="text-center my-2 relative">
              <hr className="absolute top-1/2 left-0 right-0 border-t border-gray-300" />
              <span className="relative inline-block bg-white px-2 text-xs text-gray-500">
                {formatDateLabel(dateKey)}
              </span>
            </div>
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const isCompact =
                prevMessage &&
                prevMessage.user?._id === message.user?._id &&
                differenceInMinutes(
                  new Date(message._creationTime),
                  new Date(prevMessage._creationTime)
                ) < TIME_THRESHOLD;
              return (
                <Message
                  key={message._id}
                  id={message._id}
                  memberId={message.memberId}
                  authorImage={message.user.image}
                  authorName={message.user.name}
                  isAuthor={message.memberId === currentMember?._id}
                  reactions={message.reactions}
                  body={message.body}
                  images={message.images}
                  updatedAt={message.updatedAt}
                  createdAt={message._creationTime}
                  isEditing={editingId === message._id}
                  setEditingId={setEditingId}
                  isCompact={isCompact}
                  hideThreadButton
                  threadCount={message.threadCount}
                  threadImage={message.threadImage?.[0]}
                  threadName={message.threadName}
                  threadTimestamp={message.threadTimestamp}
                />
              );
            })}
          </div>
        ))}
        <div
          className="h-1"
          ref={(el) => {
            if (el) {
              const observer = new IntersectionObserver(
                ([entry]) => {
                  if (entry.isIntersecting && canLoadMore) {
                    loadMore();
                  }
                },
                {
                  threshold: 1.0,
                }
              );
              observer.observe(el);
              return () => observer.disconnect();
            }
          }}
        />
        {isLoadingMore && (
          <div className="text-center my-2 relative">
            <hr className="absolute top-1/2 left-0 right-0 border-t border-gray-300" />
            <span className="relative inline-block bg-white px-2 text-xs text-gray-500">
              <Loader className="size-4 animate-spin" />
            </span>
          </div>
        )}
        <Message
          hideThreadButton
          memberId={message.memberId}
          authorImage={message.user.image}
          authorName={message.user.name}
          isAuthor={message.memberId === currentMember?._id}
          body={message.body}
          images={message.images}
          createdAt={message._creationTime}
          updatedAt={message.updatedAt}
          id={message._id}
          reactions={message.reactions}
          isEditing={editingId === message._id}
          setEditingId={setEditingId}
        />
      </div>
      <div className="px-4">
        <Editor
          key={editorKey}
          onSubmit={handleSubmit}
          disabled={isPending}
          placeholder="Reply..."
          // 🔥🔥🔥 新增：传入这三个参数，激活 Thread 内的草稿功能
          workspaceId={workspaceId}
          channelId={channelId}
          parentMessageId={messageId}
        />
      </div>
    </div>
  );
};
