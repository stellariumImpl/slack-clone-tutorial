import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Id } from "../../../../convex/_generated/dataModel";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import Link from "next/link";
import { Video } from "lucide-react"; // 🔥 1. 引入图标

// 🔥 2. 定义变体样式，增加 highlight
const userItemVariant = cva(
  "flex items-center gap-1.5 justify-start font-normal h-7 px-[8px] text-sm overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-[#f9edffcc]",
        active: "text-[#481349] bg-white/90 hover:bg-white/90",
        // 新增高亮样式
        highlight: "text-white font-bold hover:bg-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface UserItemProps {
  id: Id<"members">;
  label?: string;
  image?: string;
  variant?: VariantProps<typeof userItemVariant>["variant"];
  // 🔥 3. 接收新的状态属性
  hasAlert?: boolean;
  isVideoActive?: boolean;
}

export const UserItem = ({
  id,
  label = "Member",
  image,
  variant,
  hasAlert,
  isVideoActive,
}: UserItemProps) => {
  const workspaceId = useWorkspaceId();
  const avatarFallback = label.charAt(0).toUpperCase();

  // 🔥 4. 逻辑：如果有新消息 (hasAlert)，强制使用 highlight 样式
  const finalVariant =
    variant === "active" ? "active" : hasAlert ? "highlight" : "default";

  return (
    <Button
      variant="transparent"
      className={cn(userItemVariant({ variant: finalVariant }))}
      size="sm"
      asChild
    >
      <Link href={`/workspace/${workspaceId}/member/${id}`}>
        <Avatar className="size-5 rounded-md mr-1">
          <AvatarImage className="rounded-md" src={image} />
          <AvatarFallback className="rounded-md bg-sky-500 text-white text-xs">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm truncate">{label}</span>

        {/* 🔥 5. 渲染红点 (新消息提示) */}
        {hasAlert && (
          <div className="size-2 bg-rose-500 rounded-full shrink-0 ml-auto" />
        )}

        {/* 🔥 6. 渲染视频图标 (正在通话提示) */}
        {isVideoActive && (
          <Video className="size-3.5 ml-auto text-emerald-400 animate-pulse" />
        )}
      </Link>
    </Button>
  );
};
