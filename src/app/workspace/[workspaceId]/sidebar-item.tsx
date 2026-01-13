import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { LucideIcon, Video } from "lucide-react";
import Link from "next/link";
import { IconType } from "react-icons/lib";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sidebarItemVariant = cva(
  "flex items-center gap-1.5 justify-start font-normal h-7 px-[18px] text-sm overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-[#f9edffcc]",
        active: "text-[#481349] bg-white/90 hover:bg-white/90",
        // 保持 highlight 样式，但我们可以更依赖红点
        highlight: "text-white font-bold hover:bg-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface SidebarItemProps {
  label: string;
  id: string;
  icon: LucideIcon | IconType;
  variant?: VariantProps<typeof sidebarItemVariant>["variant"];
  hasAlert?: boolean;
  isVideoActive?: boolean;
}

export const SidebarItem = ({
  label,
  id,
  icon: Icon,
  variant,
  hasAlert,
  isVideoActive,
}: SidebarItemProps) => {
  const workspaceId = useWorkspaceId();

  // 这里的逻辑保持不变
  const finalVariant =
    variant === "active" ? "active" : hasAlert ? "highlight" : "default";

  return (
    <Button
      variant="transparent"
      size="sm"
      className={cn(sidebarItemVariant({ variant: finalVariant }))}
      asChild
    >
      <Link href={`/workspace/${workspaceId}/channel/${id}`}>
        <Icon className="size-3.5 mr-1 shrink-0" />
        <span className="truncate">{label}</span>

        {/* 🔥 1. 如果有未读消息，显示红点 (更显眼！) */}
        {hasAlert && (
          <div className="size-2 bg-rose-500 rounded-full shrink-0 ml-auto" />
        )}

        {/* 🔥 2. 如果正在通话，显示绿色的摄像机 */}
        {isVideoActive && (
          <Video className="size-3.5 ml-auto text-emerald-400 animate-pulse" />
        )}
      </Link>
    </Button>
  );
};
