"use client";

import {
  LiveKitRoom,
  VideoConference,
  useRemoteParticipants, // 1. 引入这个 Hook
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState, useRef } from "react"; // 引入 useRef
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

interface VideoModalProps {
  roomName: string;
  userName: string;
  // 2. 修改 onClose 类型，允许传回一个布尔值
  // true = 真的结束了 (我是最后一个人)
  // false = 还有人在 (我只是退出了)
  onClose: (shouldEndCall: boolean) => void;
}

// 3. 创建一个内部组件来监听人数
// 因为 useRemoteParticipants 必须在 LiveKitRoom 内部使用
const RoomTracker = ({
  onLeaveRef,
}: {
  onLeaveRef: React.MutableRefObject<boolean>;
}) => {
  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    // 如果远程还有人 (length > 0)，说明我不是最后一个，onLeaveRef 设为 false
    // 如果远程没人 (length === 0)，说明我是最后一个，onLeaveRef 设为 true
    onLeaveRef.current = remoteParticipants.length === 0;
  }, [remoteParticipants, onLeaveRef]);

  return null; // 这个组件不渲染任何东西，只负责逻辑
};

export default function VideoModal({
  roomName,
  userName,
  onClose,
}: VideoModalProps) {
  const [token, setToken] = useState("");
  const getToken = useAction(api.livekit.generateToken);

  // 4. 使用 Ref 来存储“我是否是最后一个人”的状态
  // 默认为 true (假设只有我一个人)，一旦检测到有人，RoomTracker 会把它改成 false
  const isLastParticipantRef = useRef(true);

  useEffect(() => {
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
        <p>Joining call...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
      }}
      // 5. 挂断时的回调
      onDisconnected={() => {
        // 把 Ref 里的值传回给父组件
        onClose(isLastParticipantRef.current);
      }}
    >
      <VideoConference />
      {/* 6. 放入我们的追踪器 */}
      <RoomTracker onLeaveRef={isLastParticipantRef} />
    </LiveKitRoom>
  );
}
