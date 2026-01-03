import { UserButton } from "@/features/auth/components/user-button";
import WorkspaceSwitcher from "./workspace-switcher";
import { SidebarButton } from "./sidebar-button";
import { Home, MessageSquare, Bell, MoreHorizontal } from "lucide-react";
export const Sidebar = () => {
  return (
    <aside className="w-[60px] shrink-0 h-full bg-[#5D33A8] flex flex-col gap-y-4 items-center pt-[9px] pb-4">
      <WorkspaceSwitcher />
      <SidebarButton icon={Home} label="Home" isActive />

      <SidebarButton icon={MessageSquare} label="DMs" />

      <SidebarButton icon={Bell} label="Notif." />

      <SidebarButton icon={MoreHorizontal} label="More" />

      <div className="flex flex-col items-center justify-center gap-y-4 mt-auto">
        <UserButton />
      </div>
    </aside>
  );
};

export default Sidebar;
