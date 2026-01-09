import { Hint } from "./hint";
import { Button } from "./ui/button";
import { MessageSquareIcon, Pencil, Smile, Trash } from "lucide-react";
import { EmojiPopover } from "./emoji-popover";

interface MessageToolbarProps {
  isAuthor: boolean;
  isPending: boolean;
  handleEdit: () => void;
  handleThread: () => void;
  handleDelete: () => void;
  handleReaction: (value: string) => void;
  hideThreadButton?: boolean;

  // 新增了一个属性，为了call视频准备的
  isSystemMessage?: boolean;
}

export const MessageToolbar = ({
  isAuthor,
  isPending,
  handleEdit,
  handleThread,
  handleDelete,
  handleReaction,
  hideThreadButton,
  isSystemMessage, // 解构
}: MessageToolbarProps) => {
  // 如果是系统消息，直接不渲染工具栏了
  if (isSystemMessage) {
    return null;
  }

  return (
    <div className="absolute top-0 right-0">
      <div className="group-hover:opacity-100 opacity-0 transition-opacity border bg-white rounded-bl-md shadow-sm">
        <EmojiPopover
          hint="Add reaction"
          onEmojiSelect={(emoji) => handleReaction(emoji.native)}
        >
          <Button variant="ghost" size="iconSm" disabled={isPending}>
            <Smile className="size-4" />
          </Button>
        </EmojiPopover>
        {!hideThreadButton && (
          <Hint label="Reply in thread">
            <Button
              variant="ghost"
              size="iconSm"
              disabled={isPending}
              onClick={handleThread}
            >
              <MessageSquareIcon className="size-4" />
            </Button>
          </Hint>
        )}

        {isAuthor && (
          <Hint label="Edit message">
            <Button
              variant="ghost"
              size="iconSm"
              disabled={isPending}
              onClick={handleEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Hint>
        )}

        {isAuthor && (
          <Hint label="Delete message">
            <Button
              variant="ghost"
              size="iconSm"
              disabled={isPending}
              onClick={handleDelete}
            >
              <Trash className="size-4" />
            </Button>
          </Hint>
        )}
      </div>
    </div>
  );
};
