import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaChevronDown } from "react-icons/fa";

import { Video } from "lucide-react";

interface HeaderProps {
  memberName?: string;
  memberImage?: string;
  onClick?: () => void;

  onCall?: () => void;
  // ✨ 1. 新增 props: 接收是否是自己的状态
  isSelf?: boolean;
}

export const Header = ({
  memberName = "Member",
  memberImage,
  onClick,

  onCall,
  isSelf = false,
}: HeaderProps) => {
  console.log("memberName", memberName);

  const avatarFallback = memberName.charAt(0).toUpperCase();

  return (
    <div className="bg-white border-b h-[49px] flex items-center justify-between px-4 overflow-hidden w-full">
      <Button
        variant="ghost"
        className="text-lg font-semibold px-2 overflow-hidden w-auto"
        size="sm"
        onClick={onClick}
      >
        <Avatar className="size-6 mr-2">
          <AvatarImage src={memberImage} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <span className="truncate">{memberName}</span>
        <FaChevronDown className="ml-2 size-2.5" />
      </Button>
      {/* 3. 右侧：添加视频通话按钮 */}
      {!isSelf && (
        <Button variant="ghost" size="iconSm" onClick={onCall}>
          <Video className="size-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
};
