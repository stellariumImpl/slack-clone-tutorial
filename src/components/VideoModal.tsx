"use client";

import {
  LiveKitRoom,
  VideoConference,
  useRemoteParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Minimize2, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// 🔥 1. 引入 framer-motion
import { motion } from "framer-motion";

interface VideoModalProps {
  roomName: string;
  userName: string;
  onClose: (shouldEndCall: boolean) => void;
}

const RoomTracker = ({
  onLeaveRef,
}: {
  onLeaveRef: React.MutableRefObject<boolean>;
}) => {
  const remoteParticipants = useRemoteParticipants();
  useEffect(() => {
    onLeaveRef.current = remoteParticipants.length === 0;
  }, [remoteParticipants, onLeaveRef]);
  return null;
};

export default function VideoModal({
  roomName,
  userName,
  onClose,
}: VideoModalProps) {
  const [token, setToken] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const getToken = useAction(api.livekit.generateToken);
  const isLastParticipantRef = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await getToken({ room: roomName, username: userName });
        setToken(t);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomName, userName, getToken]);

  if (!token)
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 text-white">
        Joining...
      </div>
    );

  return (
    // 🔥 2. 将外层 div 改为 motion.div，并配置拖拽属性
    <motion.div
      // 仅在缩小时允许拖拽
      drag={isMinimized}
      // 限制拖拽范围（通常相对于初始位置，0代表无法拖出起始点，这里允许向上和向左拖动 80vh/80vw）
      dragConstraints={{ left: -1000, right: 0, top: -1000, bottom: 0 }}
      dragElastic={0.1}
      dragMomentum={false} // 关闭惯性，防止拖出屏幕边缘
      style={{
        cursor: isMinimized ? "grab" : "auto",
        touchAction: "none", // 优化移动端手势兼容性
      }}
      whileDrag={{ cursor: "grabbing", scale: 1.02 }}
      className={cn(
        "fixed z-[100] overflow-hidden bg-background shadow-2xl border",
        // 🔥 3. 关键优化：transition 只应用在尺寸和圆角上，不要应用在 transform 上（否则拖拽会卡顿）
        "transition-[width,height,border-radius] duration-300 ease-in-out",
        isMinimized
          ? "bottom-20 right-4 w-[320px] h-[180px] rounded-xl sm:bottom-24 sm:right-8 sm:w-[400px] sm:h-[225px]"
          : "inset-0 w-full h-full rounded-none"
      )}
    >
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        onDisconnected={() => onClose(isLastParticipantRef.current)}
        className="h-full w-full relative"
      >
        <div className="absolute top-2 right-2 z-[101] flex items-center gap-2">
          <Button
            size="iconSm"
            variant="ghost"
            className="bg-black/20 hover:bg-black/40 text-white backdrop-blur-md rounded-full"
            onClick={(e) => {
              // 🔥 4. 关键：阻止冒泡，防止点击按钮触发拖拽
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? (
              <Maximize2 className="size-4" />
            ) : (
              <Minimize2 className="size-4" />
            )}
          </Button>
          {isMinimized && (
            <Button
              size="iconSm"
              variant="destructive"
              className="rounded-full"
              onClick={(e) => {
                // 🔥 4. 关键：阻止冒泡
                e.stopPropagation();
                onClose(isLastParticipantRef.current);
              }}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {/* 使用 Tailwind 强制隐藏内部的控制条 */}
        <div
          className={cn(
            "h-full w-full",
            isMinimized && "[&_.lk-control-bar]:hidden"
          )}
        >
          <VideoConference />
        </div>

        <RoomTracker onLeaveRef={isLastParticipantRef} />
      </LiveKitRoom>
    </motion.div>
  );
}
