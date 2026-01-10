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

  // ----------------------------------------------------------------------
  // 1. 复用 Channel 页面的 Loading 样式 (紫色背景)
  // ----------------------------------------------------------------------
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

  // ----------------------------------------------------------------------
  // 2. 复用 Channel 页面的主布局 (flex flex-col h-full)
  // ----------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      {/* 头部 Header 
         这里手动写了一个和 Channel Header 高度一致的头部 (h-[49px])
         因为原来的 Header 组件可能绑定了特定的 Channel 逻辑，这里只需要显示标题
      */}
      <div className="flex items-center justify-between px-4 h-[49px] border-b bg-white">
        <span className="text-lg font-bold">Threads</span>
      </div>

      {/* 列表区域：去掉了原来的 margin, shadow, rounded，让它铺满 */}
      <div className="flex-1 overflow-y-auto messages-scrollbar pb-4">
        {/* 数据列表 */}
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
            channelId={message.channelId}
            channelName={message.channelName}
            replyCount={message.replyCount}
          />
        ))}

        {/* 无数据空状态 */}
        {status === "Exhausted" && results?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
            <p>No threads found.</p>
            <p className="text-sm">
              Start a conversation by replying to a message!
            </p>
          </div>
        )}

        {/* 底部观察点 */}
        <div className="h-1" ref={observerRef} />

        {/* 加载更多 Loading */}
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
