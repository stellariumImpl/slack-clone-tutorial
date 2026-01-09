"use client";

import imageCompression from "browser-image-compression";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useCreateMessage } from "@/features/messages/api/use-create-messages";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { toast } from "sonner";
import { useGenerateUploadUrl } from "@/features/upload/api/use-generate-upload-url";
import { Id } from "../../../../../../convex/_generated/dataModel";
// 动态引入我们之前写好的 Editor 组件
// ssr: false 是为了防止 Next.js 在服务器端渲染编辑器导致报错
const Editor = dynamic(() => import("@/components/editor"), { ssr: false });

interface ChatInputProps {
  placeholder: string;
  conversationId: Id<"conversations">;
}

type CreateMessageValues = {
  conversationId: Id<"conversations">;
  workspaceId: Id<"workspaces">;
  body: string;
  images: Id<"_storage">[];
};

export const ChatInput = ({ placeholder, conversationId }: ChatInputProps) => {
  // 1. editorKey: 用来“刷新”编辑器的。
  // 当 key 变化时，React 会重新创建组件，从而清空输入框内容。
  const [editorKey, setEditorKey] = useState(0);

  // 2. isPending: 用来控制“正在发送”的状态。
  // 发送时变为 true，编辑器会变灰（不可用）。
  const [isPending, setIsPending] = useState(false);

  const workspaceId = useWorkspaceId();

  const { mutate: generateUploadUrl } = useGenerateUploadUrl();
  const { mutate: createMessage } = useCreateMessage();

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
        conversationId,
        workspaceId,
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

  return (
    <div className="px-5 w-full">
      <Editor
        key={editorKey} // 关键：key 变了，组件就重置了
        placeholder={placeholder}
        onSubmit={handleSubmit} // 绑定上面的模拟发送函数
        disabled={isPending} // 发送中禁用
      />
    </div>
  );
};
