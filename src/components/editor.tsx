"use client";

import { useEditor, EditorContent, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Toolbar } from "./toolbar";
import { Button } from "@/components/ui/button";
import {
  Smile,
  ALargeSmall,
  SendHorizonal,
  ImageIcon,
  XIcon,
} from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  useMemo, // 🔥 改用 useMemo
} from "react";
import { cn } from "@/lib/utils";
import { Hint } from "./hint";
import Image from "next/image";

import { EmojiPopover } from "./emoji-popover";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import debounce from "lodash/debounce";

type EditorValue = {
  images: File[];
  body: string;
};

interface EditorProps {
  onSubmit: ({ images, body }: EditorValue) => void;
  onCancel?: () => void;
  placeholder?: string;
  defaultValue?: string | JSONContent;
  disabled?: boolean;
  variant?: "create" | "update";
  workspaceId?: Id<"workspaces">;
  channelId?: Id<"channels">;
  parentMessageId?: Id<"messages">;
  conversationId?: Id<"conversations">;
}

const Editor = ({
  onSubmit,
  onCancel,
  placeholder = "Write something...",
  defaultValue = "",
  disabled = false,
  variant = "create",
  workspaceId,
  channelId,
  parentMessageId,
  conversationId,
}: EditorProps) => {
  // 🔒 锁1：防止重复加载草稿
  const isMessageLoadedRef = useRef(false);
  // 🔒 锁2：防止发送时触发自动保存
  const isSubmittingRef = useRef(false);

  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);

  const imageElementRef = useRef<HTMLInputElement>(null);

  const enableDrafts = variant === "create" && !!workspaceId;

  const draftData = useQuery(
    api.drafts.get,
    enableDrafts
      ? {
          workspaceId,
          channelId,
          parentMessageId,
          conversationId,
        }
      : "skip"
  );

  const saveDraft = useMutation(api.drafts.save);
  const removeDraft = useMutation(api.drafts.remove);

  // 🔥 技巧：使用 Ref 存储最新的 saveDraft 函数
  // 这样我们就不用把 saveDraft 放入 useMemo 的依赖数组，
  // 从而保证 debouncedSave 永远不会因为 saveDraft 的变化而重新生成。
  const saveDraftRef = useRef(saveDraft);
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  // 🔥🔥 核心修复：使用 useMemo 且依赖为空数组 []
  // 保证 debouncedSave 在组件全生命周期内是【同一个实例】
  // 这样 .cancel() 才能百分百清除之前的定时器
  const debouncedSave = useMemo(
    () =>
      debounce(
        (values: {
          body: string;
          workspaceId: Id<"workspaces">;
          channelId?: Id<"channels">;
          parentMessageId?: Id<"messages">;
          conversationId?: Id<"conversations">;
        }) => {
          // 在执行时调用最新的 mutation
          saveDraftRef.current(values);
        },
        500
      ),
    [] // 👈 绝对不依赖任何变量，确保稳定
  );

  // 这里的 useEffect 确保组件卸载时清理定时器
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  useEffect(() => {
    isMessageLoadedRef.current = false;
  }, [workspaceId, channelId, parentMessageId, conversationId]);

  // 🛡️ 提取公共发送逻辑 (DRY原则)
  // 无论按回车还是点按钮，都走这一条路，避免逻辑不一致
  const handleSend = () => {
    if (!editor) return;

    // 1. 立刻落锁
    isSubmittingRef.current = true;

    // 2. 彻底取消所有正在排队的草稿保存 (关键！)
    debouncedSave.cancel();

    // 3. 执行发送
    onSubmit({ body: editor.getHTML(), images });

    // 4. 后端清理草稿
    if (enableDrafts && workspaceId) {
      removeDraft({
        workspaceId,
        channelId,
        parentMessageId,
        conversationId,
      });
    }

    // 5. 前端清理
    editor.commands.clearContent();
    setImages([]);
    editor.commands.focus();
    if (imageElementRef.current) {
      imageElementRef.current.value = "";
    }

    // 6. 延迟解锁
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 1000);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    editable: !disabled,
    content: defaultValue as any,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none w-full h-full min-h-[60px] max-h-[60vh] overflow-y-auto px-3 py-2 text-sm",
      },
      handleKeyDown: (view, event) => {
        if (event.isComposing) return false;

        if (event.key === "Enter" && !event.shiftKey) {
          const isList =
            editor?.isActive("bulletList") || editor?.isActive("orderedList");
          if (isList) return false;

          event.preventDefault();
          const text = editor?.getText();

          // 校验：如果没图且没字，不发送
          if (!images.length && (!text || text.trim().length === 0)) {
            return true;
          }

          // 执行发送
          handleSend();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      const text = editor.getText().trim();
      setIsEmpty(images.length === 0 && text.length === 0);

      const html = editor.getHTML();

      // 🔥🔥 铜墙铁壁般的拦截 🔥🔥
      // 1. 如果正在提交，滚蛋
      if (isSubmittingRef.current) return;
      // 2. 如果没开草稿，滚蛋
      if (!enableDrafts || !workspaceId) return;
      // 3. 如果编辑器是空的，不保存 (防止把空的也存进去，虽然 removeDraft 已经删了)
      if (editor.isEmpty) return;

      // 通过所有检查，才允许倒计时保存
      debouncedSave({
        body: html,
        workspaceId,
        channelId,
        parentMessageId,
        conversationId,
      });
    },
    onSelectionUpdate({ editor }) {
      const text = editor.getText().trim();
      setIsEmpty(images.length === 0 && text.length === 0);
    },
    immediatelyRender: false,
  });

  // 草稿回填逻辑
  useEffect(() => {
    if (
      !editor ||
      editor.isDestroyed ||
      isMessageLoadedRef.current ||
      isSubmittingRef.current // 提交中也不许回填
    ) {
      return;
    }

    if (draftData === undefined) return;

    isMessageLoadedRef.current = true;

    if (draftData?.body) {
      editor.commands.setContent(draftData.body);
      editor.commands.focus("end");
    }
  }, [draftData, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (editor) {
      const text = editor.getText().trim();
      setIsEmpty(images.length === 0 && text.length === 0);
    }
  }, [images, editor]);

  const toggleToolbar = () => {
    setIsToolbarVisible((current) => !current);
    const toolbarElement = document.querySelector(".ProseMirror");
    if (toolbarElement) {
      (toolbarElement as HTMLElement).focus();
    }
  };

  const onEmojiSelect = (emoji: any) => {
    editor?.chain().focus().insertContent(emoji.native).run();
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col">
      <input
        type="file"
        accept="image/*"
        ref={imageElementRef}
        multiple
        onChange={(event) => {
          if (event.target.files) {
            setImages((prev) => [...prev, ...Array.from(event.target.files!)]);
            event.target.value = "";
          }
        }}
        className="hidden"
      />

      <div
        className={cn(
          "relative flex flex-col border border-gray-300 rounded-md overflow-hidden bg-white focus-within:shadow-sm focus-within:border-gray-400 transition-all",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {disabled && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50">
            <span className="text-sm font-medium text-muted-foreground">
              Message sending...
            </span>
          </div>
        )}

        <div
          className={cn(
            "transition-all duration-200",
            !isToolbarVisible && "hidden"
          )}
        >
          <Toolbar editor={editor} />
        </div>

        <div className="flex-1">
          <EditorContent editor={editor} />
        </div>

        {!!images.length && (
          <div className="p-2">
            <div className="relative flex gap-x-2 group/image">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative size-[62px] flex items-center justify-center group/image"
                >
                  <Hint label="Remove image">
                    <button
                      onClick={() => {
                        setImages(images.filter((_, i) => i !== idx));
                        if (imageElementRef.current) {
                          imageElementRef.current.value = "";
                        }
                      }}
                      className="hidden group-hover/image:flex rounded-full bg-black/70 hover:bg-black absolute -top-2.5 -right-2.5 text-white size-6 z-4 border-2 border-white items-center justify-center"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </Hint>
                  <Image
                    src={URL.createObjectURL(img)}
                    alt="Uploaded"
                    fill
                    className="rounded-xl overflow-hidden border object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-x-1">
            <Hint label="Toolbar switch" side="top" align="center">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleToolbar}
                className={cn(
                  "size-8 hover:bg-gray-100 cursor-pointer",
                  isToolbarVisible && "bg-gray-100 text-[#5d33a8]"
                )}
              >
                <ALargeSmall className="size-5" />
              </Button>
            </Hint>
            <EmojiPopover onEmojiSelect={onEmojiSelect}>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hover:bg-gray-100 cursor-pointer"
              >
                <Smile className="size-5 text-gray-500" />
              </Button>
            </EmojiPopover>

            {variant === "create" && (
              <Hint label="Image" side="top" align="center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.currentTarget.blur();
                    imageElementRef.current?.click();
                  }}
                  className="size-8 hover:bg-gray-100 cursor-pointer"
                >
                  <ImageIcon className="size-5 text-gray-500" />
                </Button>
              </Hint>
            )}
          </div>

          {variant === "update" && (
            <div className="flex items-center gap-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={disabled}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onSubmit({ body: editor.getHTML(), images });
                }}
                disabled={disabled || isEmpty}
                className={cn(
                  "text-xs h-8 text-white",
                  "bg-[#5d33a8] hover:bg-[#5d33a8]/80"
                )}
              >
                Save
              </Button>
            </div>
          )}

          {variant === "create" && (
            <div className="flex items-center gap-x-2">
              {/* 使用提取出来的 handleSend */}
              <Button
                disabled={disabled || isEmpty}
                size="icon"
                onClick={handleSend}
                className={cn(
                  "size-8 transition-colors cursor-pointer",
                  isEmpty
                    ? "bg-gray-100 text-gray-400 hover:bg-gray-100"
                    : "bg-[#5d33a8] text-white hover:bg-[#5d33a8]/80"
                )}
              >
                <SendHorizonal className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {variant === "create" && (
        <div
          className={cn(
            "px-2 pt-2 text-[10px] text-muted-foreground flex justify-end opacity-0 transition",
            !isEmpty && "opacity-100"
          )}
        >
          <p>
            <strong>Shift + Return</strong> to add a new line
          </p>
        </div>
      )}
    </div>
  );
};

export default Editor;
