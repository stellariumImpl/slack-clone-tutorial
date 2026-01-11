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
  MutableRefObject,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import { Hint } from "./hint";
import Image from "next/image";

import { EmojiPopover } from "./emoji-popover";

// 🔥🔥 引入 Convex 和 Lodash
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import debounce from "lodash/debounce";

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
  variant?: "create" | "update";

  // 🔥🔥 接收 ID 参数 (必须传)
  workspaceId?: Id<"workspaces">;
  channelId?: Id<"channels">;
  parentMessageId?: Id<"messages">;

  // 🔥 新增
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
  // 🔥 接收面对面conversation参数
  conversationId, // ✅ 接收参数
}: EditorProps) => {
  // 用来标记“当前频道的草稿是否已经初始化过”
  // 🔒 锁1：负责“只读一次”
  const isMessageLoadedRef = useRef(false);

  // 🔒 锁2：负责“刚刚发送完” (新增这把锁！)
  // 专门用来防御：ID变化导致的锁1重置 + 后端删除延迟
  const isSubmittingRef = useRef(false);

  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  // 修改：状态改为数组，初始为空数组
  const [images, setImages] = useState<File[]>([]);

  // 【关键修改 1】使用 state 来存储 isEmpty 状态，以便触发重渲染
  // 默认为 true (空)
  const [isEmpty, setIsEmpty] = useState(true);

  const imageElementRef = useRef<HTMLInputElement>(null);

  // 🔥🔥 只有在 create 模式且参数齐全时，才启用草稿功能
  const enableDrafts = variant === "create" && !!workspaceId;
  // 读取草稿
  const draftData = useQuery(
    api.drafts.get,
    enableDrafts
      ? {
          workspaceId,
          channelId,
          parentMessageId, // 🔥🔥🔥 【核心修复】必须加上这个！
          conversationId,
        }
      : "skip"
  );

  // 准备 mutation
  const saveDraft = useMutation(api.drafts.save);
  const removeDraft = useMutation(api.drafts.remove);

  // 🔥🔥 创建防抖保存函数 (500ms 延迟)
  // 只有停止打字 500ms 后，才请求后端保存
  const debouncedSave = useCallback(
    debounce(
      (values: {
        body: string;
        workspaceId: Id<"workspaces">;
        channelId?: Id<"channels">;
        parentMessageId?: Id<"messages">;
        conversationId?: Id<"conversations">;
      }) => {
        saveDraft(values);
      },
      500
    ),
    [saveDraft]
  );

  // 🔥 每次切换频道/对话时，把锁打开，允许加载新草稿
  // 🔄 监听 ID 变化
  useEffect(() => {
    // 只有当真正的频道/对话 ID 发生变化时，才重置加载锁
    isMessageLoadedRef.current = false;
    // 注意：这里我们【不】重置 isSubmittingRef
    // 这样即使 ID 在发送瞬间变了（比如创建新对话），“正在提交”的拦截状态依然有效
  }, [workspaceId, channelId, parentMessageId, conversationId]);

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

          // 🛑【第一处修改】按下回车瞬间，立马落锁！
          isSubmittingRef.current = true;

          // 提交 images 数组
          onSubmit({ body: editor?.getHTML() || "", images });

          // 🔥🔥 发送成功后，删除草稿
          if (enableDrafts && workspaceId) {
            // 🔥 新增：立刻取消掉任何即将发生的保存，防止“回光返照”
            debouncedSave.cancel();
            removeDraft({ workspaceId, channelId, parentMessageId });
          }

          // 补全：清理工作 (与 Send 按钮保持一致)
          editor?.commands.clearContent();
          setImages([]); // 清空数组
          // 补全：聚焦回编辑器，方便连续打字
          editor?.commands.focus();

          // 补全：重置文件输入框
          if (imageElementRef.current) {
            imageElementRef.current.value = "";
          }

          // ⏰【新增】1秒后解锁，防止永久锁死（虽然切换频道会重置组件，但为了保险）
          setTimeout(() => {
            isSubmittingRef.current = false;
          }, 1000);

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

      const html = editor.getHTML();
      // 🔥🔥 监听内容变化，更新草稿
      // 核心修复：只有当编辑器“不为空”时，才执行保存
      if (enableDrafts && workspaceId && !editor.isEmpty) {
        debouncedSave({
          body: html,
          workspaceId,
          channelId,
          parentMessageId,
          conversationId,
        });
      }
    },
    // 【关键修改 3】监听选区更新 (可选，有时光标变动也需要重新检查)
    onSelectionUpdate({ editor }) {
      const text = editor.getText().trim();
      setIsEmpty(images.length === 0 && text.length === 0);
    },
    immediatelyRender: false,
  });

  // 🔥🔥 核心修复：只在初始化时加载一次草稿，后续坚决不再同步
  useEffect(() => {
    // 1. 如果编辑器不存在 / 已销毁 / 已经加载过一次 / 🛑 或者正在提交中
    if (
      !editor ||
      editor.isDestroyed ||
      isMessageLoadedRef.current ||
      isSubmittingRef.current
    ) {
      return;
    }

    // 2. 如果 draftData 还没从后端加载回来 (undefined)，继续等
    if (draftData === undefined) return;

    // 3. 标记为“已处理”
    // 无论有没有草稿，只要数据回来了，我们就认为初始化完成了。
    // 这样当你发送消息清空编辑器时，这个 Effect 就会因为这个标记而拒绝执行回填。
    isMessageLoadedRef.current = true;

    // 4. 只有真的有内容时，才填充
    if (draftData?.body) {
      editor.commands.setContent(draftData.body);
      // 顺便把光标移到最后，体验更好
      editor.commands.focus("end");
    }
  }, [draftData, editor]);

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
                  // 🛑【修改 1】一点击马上落锁
                  isSubmittingRef.current = true;

                  onSubmit({ body: editor.getHTML(), images });

                  // 🔥 点击按钮发送时，删除草稿
                  if (enableDrafts && workspaceId) {
                    // 🔥 新增：这里也要加 cancel
                    debouncedSave.cancel();
                    removeDraft({
                      workspaceId,
                      channelId,
                      parentMessageId,
                      conversationId,
                    });
                  }

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

                  // ⏰【修改 2】1秒后解锁
                  // 👈 加在函数最后面
                  setTimeout(() => {
                    isSubmittingRef.current = false;
                  }, 1000);
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
