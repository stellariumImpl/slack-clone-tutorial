import { LucideIcon } from "lucide-react";

import { IconType } from "react-icons/lib";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarButtonProps {
  icon: LucideIcon | IconType;
  label: string;
  isActive?: boolean;
}

export const SidebarButton = ({
  icon: Icon,
  label,
  isActive,
}: SidebarButtonProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-y-0.5 cursor-pointer group">
      <Button
        variant="transparent"
        className={cn(
          "size-9 p-2 group-hover:bg-accent/20",
          isActive ? "bg-accent/20" : "bg-transparent"
        )}
      >
        <Icon
          className={cn(
            "size-5 transition-all group-hover:scale-110",
            isActive ? "text-white" : "text-white/70 group-hover:text-white"
          )}
        />
      </Button>
      <span
        className={cn(
          "text-[11px] group-hover:text-accent transition-colors",
          isActive ? "text-white font-bold" : "text-white/70"
        )}
      >
        {label}
      </span>
    </div>
  );
};
