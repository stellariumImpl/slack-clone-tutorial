"use client";

import { useChannelId } from "@/hooks/use-channel-id";

import { useGetChannel } from "@/features/channels/api/use-get-channel";

import { Loader2, TriangleAlert } from "lucide-react";
import { Header } from "./header";

const ChannelIdPage = () => {
  const channelId = useChannelId();
  const { data: channel, isLoading: channelLoading } = useGetChannel({
    id: channelId,
  });

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

  return (
    <div className="flex flex-col h-full">
      <Header name={channel.name} />
    </div>
  );
};

export default ChannelIdPage;
