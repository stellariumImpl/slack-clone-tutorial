import { UserButton } from "@/features/auth/components/user-button";
import WorkspaceSwitcher from "./workspace-switcher";
import { SidebarButton } from "./sidebar-button";
import { Home, MessageSquare, Bell, MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
export const Sidebar = () => {
  const pathname = usePathname();
  return (
    <aside className="shrink-0 h-full bg-[#5d33a8] flex flex-col gap-y-4 items-center pt-[9px] pb-4">
      <WorkspaceSwitcher />
      <SidebarButton icon={Home} isActive={pathname.includes("/workspace")} />
      {/* 
      <SidebarButton icon={MessageSquare} />

      <SidebarButton icon={Bell} />

      <SidebarButton icon={MoreHorizontal} /> */}

      <div className="flex flex-col items-center justify-center gap-y-4 mt-auto">
        <UserButton />
      </div>
    </aside>
  );
};

export default Sidebar;
