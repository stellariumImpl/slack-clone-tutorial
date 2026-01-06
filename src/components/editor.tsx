"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Toolbar } from "./toolbar";
import { Button } from "@/components/ui/button";
import { Smile, ALargeSmall, SendHorizonal, ImageIcon } from "lucide-react";
import { useState, MutableRefObject } from "react";
import { cn } from "@/lib/utils";
import { Hint } from "./hint";

interface EditorProps {
  onSubmit: ({ body }: { body: string }) => void;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
  innerRef?: MutableRefObject<any>;

  variant?: "create" | "update";
  onCancel?: () => void;
}

const Editor = ({
  onSubmit,
  disabled = false,
  placeholder = "Write something...",
  defaultValue = "",
  innerRef,

  variant = "create",
  onCancel,
}: EditorProps) => {
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none w-full h-full min-h-[60px] max-h-[60vh] overflow-y-auto px-3 py-2 text-sm",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          const text = editor?.getText();
          if (!text || text.trim().length === 0) {
            return true;
          }
          // onSubmit({ body: editor?.getHTML() || "" });
          editor?.commands.clearContent();
          return true;
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  const toggleToolbar = () => {
    setIsToolbarVisible((current) => !current);
    const toolbarElement = document.querySelector(".ProseMirror");
    if (toolbarElement) {
      (toolbarElement as HTMLElement).focus();
    }
  };

  if (!editor) {
    return null;
  }

  const isEmpty = editor.getText().trim().length === 0;

  return (
    <div className="flex flex-col">
      {/* 1. 编辑器主体区域 (带边框、圆角和白色背景) */}
      <div className="flex flex-col border border-gray-300 rounded-md overflow-hidden bg-white focus-within:shadow-sm focus-within:border-gray-400 transition-all">
        {/* 顶部工具栏 */}
        <div
          className={cn(
            "transition-all duration-200",
            !isToolbarVisible && "hidden"
          )}
        >
          <Toolbar editor={editor} />
        </div>

        {/* 编辑内容区 */}
        <div className="flex-1">
          <EditorContent editor={editor} />
        </div>

        {/* 底部按钮区 (表情、图片、发送) */}
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
            <Hint label="Smile" side="top" align="center">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hover:bg-gray-100 cursor-pointer"
              >
                <Smile className="size-5 text-gray-500" />
              </Button>
            </Hint>

            {variant === "create" && (
              <Hint label="Image" side="top" align="center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-gray-100 cursor-pointer"
                >
                  <ImageIcon className="size-5 text-gray-500" />
                </Button>
              </Hint>
            )}
          </div>

          {/* 专供update的发送按钮 */}
          {variant === "update" && (
            <div className="flex items-center gap-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={disabled}
                className="text-xs h-8" // 稍微调小一点，看起来更精致
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onSubmit({ body: editor.getHTML() });
                }}
                disabled={disabled || isEmpty}
                className={cn(
                  "text-xs h-8 text-white", // 稍微调小一点
                  "bg-[#5d33a8] hover:bg-[#5d33a8]/80" // 已修改为主题紫色
                )}
              >
                Save
              </Button>
            </div>
          )}

          {/* 发送按钮 */}
          {variant === "create" && (
            <div className="flex items-center gap-x-2">
              <Button
                disabled={disabled || isEmpty}
                size="icon"
                onClick={() => {
                  // onSubmit({ body: editor.getHTML() });
                  editor.commands.clearContent();
                }}
                className={cn(
                  "size-8 transition-colors cursor-pointer",
                  isEmpty
                    ? "bg-gray-100 text-gray-400 hover:bg-gray-100"
                    : "bg-[#5d33a8] text-white hover:bg-[#5d33a8]/80" // 已修改为主题紫色
                )}
              >
                <SendHorizonal className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. 底部提示文字 (位于边框外部，右对齐) */}
      <div className="px-2 pt-2 text-[10px] text-muted-foreground flex justify-end">
        <p>
          <strong>Shift + Return</strong> to add a new line
        </p>
      </div>
    </div>
  );
};

export default Editor;
