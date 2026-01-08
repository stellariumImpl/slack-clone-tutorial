"use client";

import { useChannelId } from "@/hooks/use-channel-id";
import { useGetChannel } from "@/features/channels/api/use-get-channel";
import { Loader2, TriangleAlert } from "lucide-react";

import { Header } from "./header";
// Ensure this path points to the file we created above
import { ChatInput } from "./chat-input";

const ChannelIdPage = () => {
  const channelId = useChannelId();

  const { data: channel, isLoading: channelLoading } = useGetChannel({
    id: channelId,
  });

  // 1. Loading State (Purple Background)
  if (channelLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-white/80" />
          <p className="text-white/80 font-bold text-lg tracking-wide">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State (Channel Not Found)
  if (!channel) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#5d33a8]">
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-6 text-white/80" />
          <span className="text-sm text-white/80">No channel found</span>
        </div>
      </div>
    );
  }

  // 3. Main Layout
  return (
    <div className="flex flex-col h-full">
      <Header name={channel.name} />

      {/* Spacer: pushes ChatInput to the bottom */}
      <div className="flex-1" />

      <ChatInput placeholder={`Message # ${channel.name}`} />
    </div>
  );
};

export default ChannelIdPage;
