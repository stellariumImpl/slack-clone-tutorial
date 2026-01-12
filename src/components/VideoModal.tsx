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
    <div
      className={cn(
        "fixed z-[100] transition-all duration-300 ease-in-out overflow-hidden bg-background shadow-2xl border",
        isMinimized
          ? "bottom-20 right-4 w-[320px] h-[180px] rounded-xl sm:bottom-24 sm:right-8 sm:w-[400px] sm:h-[225px]"
          : "inset-0 w-full h-full"
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
            onClick={() => setIsMinimized(!isMinimized)}
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
              onClick={() => onClose(isLastParticipantRef.current)}
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
    </div>
  );
}
