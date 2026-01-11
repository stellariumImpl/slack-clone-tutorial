"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { usePaginatedQuery } from "convex/react";

import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { api } from "../../../../../../convex/_generated/api";

import { ThreadCard } from "@/components/thread-card";

const BATCH_SIZE = 20;

const ThreadsPage = () => {
  const workspaceId = useWorkspaceId();

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    { workspaceId },
    { initialNumItems: BATCH_SIZE }
  );

  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && status === "CanLoadMore") {
          loadMore(BATCH_SIZE);
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [status, loadMore]);

  // 1. Loading State
  if (status === "LoadingFirstPage") {
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-[49px] border-b bg-white">
        <span className="text-lg font-bold">Threads</span>
      </div>

      <div className="flex-1 overflow-y-auto messages-scrollbar pb-4">
        {results?.map((message) => (
          <ThreadCard
            key={message._id}
            messageId={message._id}
            body={message.body}
            images={message.images}
            updatedAt={message.lastReplyAt || message._creationTime}
            createdAt={message._creationTime}
            authorName={message.user?.name}
            authorImage={message.user?.image}
            // --------------------------------------------------------
            // 🔥 核心修复：把 null 转为 undefined，解决红线报错
            // --------------------------------------------------------
            channelId={message.channelId}
            channelName={message.channelName ?? undefined} // Fix here
            replyCount={message.replyCount}
            conversationId={message.conversationId}
            conversationName={message.conversationName ?? undefined} // Fix here
            // 🔥🔥 核心修复：把可能为 null 的 ID 转换为 undefined
            conversationMemberId={message.conversationMemberId ?? undefined}

            // --------------------------------------------------------
          />
        ))}

        {status === "Exhausted" && results?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
            <p>No threads found.</p>
            <p className="text-sm">
              Start a conversation by replying to a message!
            </p>
          </div>
        )}

        <div className="h-1" ref={observerRef} />

        {status === "LoadingMore" && (
          <div className="text-center my-2 relative">
            <hr className="absolute top-1/2 left-0 right-0 border-t border-gray-300" />
            <span className="relative inline-block bg-white px-2 text-xs text-gray-500">
              <Loader2 className="size-4 animate-spin" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadsPage;
