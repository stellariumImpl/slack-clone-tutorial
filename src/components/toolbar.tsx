"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  MessageSquareQuote,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  editor: Editor | null;
}

export const Toolbar = ({ editor }: ToolbarProps) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 rounded-t-md">
      {/* 加粗 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(
          "size-7 hover:bg-gray-200 cursor-pointer",
          editor.isActive("bold") && "bg-gray-200 text-black"
        )}
      >
        <Bold className="size-4" />
      </Button>
      {/* 斜体 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(
          "size-7 hover:bg-gray-200 cursor-pointer",
          editor.isActive("italic") && "bg-gray-200 text-black"
        )}
      >
        <Italic className="size-4" />
      </Button>
      {/* 删除线 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={cn(
          "size-7 hover:bg-gray-200 cursor-pointer",
          editor.isActive("strike") && "bg-gray-200 text-black"
        )}
      >
        <Strikethrough className="size-4" />
      </Button>
      <div className="w-[1px] h-4 bg-gray-300 mx-1" /> {/* 分割线 */}
      {/* 无序列表 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "size-7 hover:bg-gray-200 cursor-pointer",
          editor.isActive("bulletList") && "bg-gray-200 text-black"
        )}
      >
        <List className="size-4" />
      </Button>
      {/* 有序列表 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "size-7 hover:bg-gray-200 cursor-pointer",
          editor.isActive("orderedList") && "bg-gray-200 text-black"
        )}
      >
        <ListOrdered className="size-4" />
      </Button>
    </div>
  );
};
