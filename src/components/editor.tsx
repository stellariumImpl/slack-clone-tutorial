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
import { useState, MutableRefObject, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Hint } from "./hint";
import Image from "next/image";

import { EmojiPopover } from "./emoji-popover";

// 修改类型定义，因为我希望image变成images
type EditorValue = {
  images: File[];
  body: string;
};

interface EditorProps {
  // 注意：父组件调用 onSubmit 时也要适配 images 数组
  onSubmit: ({ images, body }: EditorValue) => void;
  onCancel?: () => void;
  placeholder?: string;
  defaultValue?: string | JSONContent;
  disabled?: boolean;
  innerRef?: MutableRefObject<any>;
  variant?: "create" | "update";
}

const Editor = ({
  onSubmit,
  onCancel,
  placeholder = "Write something...",
  defaultValue = "",
  disabled = false,
  innerRef,
  variant = "create",
}: EditorProps) => {
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  // 修改：状态改为数组，初始为空数组
  const [images, setImages] = useState<File[]>([]);

  // 【关键修改 1】使用 state 来存储 isEmpty 状态，以便触发重渲染
  // 默认为 true (空)
  const [isEmpty, setIsEmpty] = useState(true);

  const imageElementRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    // 修改：初始化时根据 disabled 设置是否可编辑
    editable: !disabled,
    content: defaultValue as any,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none w-full h-full min-h-[60px] max-h-[60vh] overflow-y-auto px-3 py-2 text-sm",
      },
      handleKeyDown: (view, event) => {
        // 新增：检查是否正在使用输入法 (IME)
        // 如果正在选词中，直接返回 false，让浏览器处理选词逻辑
        if (event.isComposing) {
          return false;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          //如果按的是回车，并且当前正在列表里，就不发送，而是执行换行
          const isList =
            editor?.isActive("bulletList") || editor?.isActive("orderedList");
          if (isList) {
            return false; // 返回 false，让 Tiptap 执行默认的“新增列表项”行为
          }

          event.preventDefault();
          const text = editor?.getText();
          // 修改：逻辑判断：检查数组长度
          if (!images.length && (!text || text.trim().length === 0)) {
            return true;
          }
          // 提交 images 数组
          onSubmit({ body: editor?.getHTML() || "", images });
          // 补全：清理工作 (与 Send 按钮保持一致)
          editor?.commands.clearContent();
          setImages([]); // 清空数组
          // 补全：聚焦回编辑器，方便连续打字
          editor?.commands.focus();

          // 补全：重置文件输入框
          if (imageElementRef.current) {
            imageElementRef.current.value = "";
          }
          return true;
        }
        return false;
      },
    },
    // 【关键修改 2】监听内容更新事件
    onUpdate({ editor }) {
      const text = editor.getText().trim();
      // 如果有图片 或者 有文字，isEmpty 为 false
      // 修改：逻辑判断
      setIsEmpty(images.length === 0 && text.length === 0);
    },
    // 【关键修改 3】监听选区更新 (可选，有时光标变动也需要重新检查)
    onSelectionUpdate({ editor }) {
      const text = editor.getText().trim();
      setIsEmpty(images.length === 0 && text.length === 0);
    },
    immediatelyRender: false,
  });

  // 监听 disabled 变化，动态开关编辑器
  // 这一步至关重要！没有它，isPending 变 true 时，编辑器不会锁死
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  // 当图片状态变化时，也需要重新计算 isEmpty
  // 修改：Effect 依赖改为 images
  useEffect(() => {
    if (editor) {
      const text = editor.getText().trim();
      setIsEmpty(images.length === 0 && text.length === 0);
    }
  }, [images, editor]);

  // 监听 defaultValue 回显
  useEffect(() => {
    if (editor && defaultValue) {
      // editor.commands.setContent(defaultValue);
    }
  }, [defaultValue, editor]);

  const toggleToolbar = () => {
    setIsToolbarVisible((current) => !current);
    const toolbarElement = document.querySelector(".ProseMirror");
    if (toolbarElement) {
      (toolbarElement as HTMLElement).focus();
    }
  };

  const onEmojiSelect = (emoji: any) => {
    // 1. 这里的字段通常是 native，而不是 emoji
    // 2. 使用 chain().focus() 确保编辑器重新获得焦点，否则插入可能会失败
    editor?.chain().focus().insertContent(emoji.native).run();
  };

  if (!editor) {
    return null;
  }

  // 这里不再需要 const isEmpty = ... 的动态计算，直接用 state

  return (
    <div className="flex flex-col">
      <input
        type="file"
        accept="image/*"
        ref={imageElementRef}
        // 修改：添加multiple属性
        multiple
        onChange={(event) => {
          if (event.target.files) {
            setImages((prev) => [...prev, ...Array.from(event.target.files!)]);
            // 清空input value，防止删掉图片后无法再次选择同一张图片
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
        {/* 插入遮罩层代码 */}
        {disabled && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50">
            {/* 这一层 div 会铺满整个编辑器，并半透明显示 */}
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

        {/* 预览区域也得修改 */}
        {!!images.length && (
          <div className="p-2">
            {/* 这里不能用 size-[62px] 固定死，改用 flex gap-x-2 让它横向排列 */}
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
                    // 核心修复：强制让当前按钮失去焦点
                    // 这样 Tooltip 就会认为“鼠标既没悬停，也没聚焦”，于是自动消失
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
              <Button
                disabled={disabled || isEmpty}
                size="icon"
                onClick={() => {
                  onSubmit({ body: editor.getHTML(), images });
                  // 1. 清理 Tiptap 内容
                  editor.commands.clearContent();
                  // 2. 清理图片状态
                  setImages([]);
                  // 3. 聚焦回编辑器
                  editor.commands.focus();
                  // 4. 重置文件输入框
                  if (imageElementRef.current) {
                    imageElementRef.current.value = "";
                  }
                }}
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
