import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { LucideIcon } from "lucide-react";
import Link from "next/link"; // 修正：从 next/link 引入真正的跳转组件
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
}

export const SidebarItem = ({
  label,
  id,
  icon: Icon, // 修正：把小写 icon 重命名为大写 Icon，以便作为组件渲染
  variant,
}: SidebarItemProps) => {
  const workspaceId = useWorkspaceId();

  return (
    <Button
      variant="transparent"
      size="sm"
      className={cn(sidebarItemVariant({ variant }))}
      asChild
    >
      <Link href={`/workspace/${workspaceId}/channel/${id}`}>
        {/* 修正：直接渲染传入的图标组件，而不是 lucide-react 的通用 Icon */}
        <Icon className="size-3.5 mr-1 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    </Button>
  );
};
