// components/VideoModal.tsx
"use client";

import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
} from "@livekit/components-react";
import "@livekit/components-styles"; // 这一行非常重要，引入默认样式
import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api"; // 确保路径对

interface VideoModalProps {
  roomName: string;
  userName: string;
  onClose: () => void;
}

export default function VideoModal({
  roomName,
  userName,
  onClose,
}: VideoModalProps) {
  const [token, setToken] = useState("");
  // 调用刚才写的 Convex Action
  const getToken = useAction(api.livekit.generateToken);

  useEffect(() => {
    // 组件加载时，立刻去请求 Token
    (async () => {
      try {
        const t = await getToken({ room: roomName, username: userName });
        setToken(t);
      } catch (e) {
        console.error("无法获取 Token:", e);
      }
    })();
  }, [roomName, userName, getToken]);

  if (!token) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <p>正在加入通话...</p>
      </div>
    );
  }

  return (
    // LiveKitRoom 是核心容器，负责连接 WebSocket
    <LiveKitRoom
      video={true} // 默认开启视频
      audio={true} // 默认开启音频
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} // 记得在 .env.local 填这个
      onDisconnected={onClose} // 挂断时触发
      data-lk-theme="default"
      style={{
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      {/* VideoConference 是 LiveKit 自带的“全家桶”UI。
        它包含了视频网格、控制栏（静音/挂断/屏幕共享）等。
      */}
      <VideoConference />
    </LiveKitRoom>
  );
}
