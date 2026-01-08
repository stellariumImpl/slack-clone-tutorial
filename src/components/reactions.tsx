import { useCurrentMember } from "@/features/members/api/use-current-member";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { EmojiPopover } from "./emoji-popover";
import { MdOutlineAddReaction } from "react-icons/md";

interface ReactionsProps {
  data: Array<
    Omit<Doc<"reactions">, "memberId"> & {
      count: number;
      memberIds: Id<"members">[];
    }
  >;
  onChange: (value: string) => void;
}

export const Reactions = ({ data, onChange }: ReactionsProps) => {
  const workspaceId = useWorkspaceId();

  const { data: currentMember } = useCurrentMember({
    workspaceId,
  });

  const currentMemberId = currentMember?._id;

  if (data.length === 0 || !currentMemberId) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-1 mb-1">
      {data.map((reaction) => {
        const hasReacted = reaction.memberIds.includes(currentMemberId);

        return (
          <Hint
            key={reaction._id}
            label={`${reaction.count} ${reaction.count === 1 ? "person" : "people"} reacted with ${reaction.value}`}
          >
            <button
              onClick={() => onChange(reaction.value)}
              className={cn(
                // 1. 基础样式：圆角更大(rounded-2xl)，高度统一，增加过渡动画
                "h-6 px-2 rounded-full border border-transparent flex items-center gap-x-1 transition-all duration-200",

                // 2. 默认状态（未选中）：浅灰背景，hover时稍微变深
                "bg-slate-100 text-slate-800 hover:border-slate-400/50 hover:bg-slate-200/50",

                // 3. 激活状态（已选中）：浅蓝背景 + 蓝色边框 + 蓝色文字
                hasReacted &&
                  "bg-blue-50/70 border-blue-400 text-blue-600 hover:bg-blue-100"
              )}
            >
              {/* Emoji 大小 */}
              <span className="text-sm">{reaction.value}</span>

              <span
                className={cn(
                  "text-xs font-semibold text-muted-foreground",
                  // 选中时，数字也变成蓝色
                  hasReacted && "text-blue-600"
                )}
              >
                {reaction.count}
              </span>
            </button>
          </Hint>
        );
      })}

      {/* 添加按钮 */}
      <EmojiPopover
        hint="Add reaction"
        onEmojiSelect={(emoji) => onChange(emoji.native)}
      >
        <button className="h-6 px-3 rounded-full bg-slate-100 border border-transparent hover:border-slate-400/50 hover:bg-slate-200/50 text-slate-400 flex items-center justify-center transition-all duration-200">
          <MdOutlineAddReaction className="size-4" />
        </button>
      </EmojiPopover>
    </div>
  );
};
