"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { liteClient as algoliasearch } from "algoliasearch/lite";
import {
  InstantSearch,
  SearchBox,
  Hits,
  Configure,
  Highlight,
  useInstantSearch,
} from "react-instantsearch";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  SearchIcon,
  MessageSquare,
  CornerDownLeft,
  Hash,
  User,
} from "lucide-react";

// 🔥 安全初始化
const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

const searchClient = appId && apiKey ? algoliasearch(appId, apiKey) : null;

interface SearchProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Hit = ({ hit, onClick }: { hit: any; onClick: () => void }) => {
  const isChannel = !!hit.channelId;
  const Icon = isChannel ? Hash : User;

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-4 p-3 cursor-pointer rounded-lg transition-all duration-200 hover:bg-[#5d33a8]/5 mx-2 my-1 border border-transparent hover:border-[#5d33a8]/10"
    >
      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#5d33a8] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 group-hover:bg-[#5d33a8] group-hover:text-white transition-colors">
        <Icon className="size-5" />
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">
            <Highlight
              attribute="authorName"
              hit={hit}
              classNames={{
                highlighted:
                  "bg-[#5d33a8]/20 text-[#5d33a8] font-bold rounded-sm px-0.5",
              }}
            />
          </span>
          <span className="text-[10px] text-gray-400 shrink-0 font-mono">
            {new Date(hit.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="text-sm text-gray-500 line-clamp-1 break-all group-hover:text-gray-700">
          {/* 暂时还是保留 Highlight，为了去掉 <p> 标签，我们得在后端做处理。
               前端硬去的话可能会把高亮标签也去了。
               如果你非要前端去，可以写个正则，但这里先保留原样 */}
          <Highlight
            attribute="body"
            hit={hit}
            classNames={{
              highlighted:
                "bg-[#5d33a8]/20 text-[#5d33a8] font-medium rounded-sm px-0.5",
            }}
          />
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2">
        <CornerDownLeft className="size-4 text-[#5d33a8]" />
      </div>
    </div>
  );
};

const EmptyState = () => {
  const { results } = useInstantSearch();

  if (!results?.query) return null;
  if (results.nbHits > 0) return null;

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="bg-gray-50 p-3 rounded-full mb-3">
        <SearchIcon className="size-6 text-gray-400" />
      </div>
      <p className="text-gray-900 font-medium">No results found</p>
      <p className="text-sm text-gray-500 mt-1">
        No messages found for{" "}
        <span className="font-bold">"{results.query}"</span>
      </p>
    </div>
  );
};

export const Search = ({ open, setOpen }: SearchProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  if (!searchClient) return null;

  const handleSelect = (hit: any) => {
    setOpen(false);

    if (hit.parentMessageId && hit.channelId) {
      router.push(
        `/workspace/${workspaceId}/channel/${hit.channelId}?parentMessageId=${hit.parentMessageId}&messageId=${hit.objectID}`
      );
      return;
    }
    if (hit.channelId) {
      router.push(
        `/workspace/${workspaceId}/channel/${hit.channelId}?messageId=${hit.objectID}`
      );
      return;
    }
    if (hit.conversationId) {
      router.push(
        `/workspace/${workspaceId}/member/${hit.conversationId}?messageId=${hit.objectID}`
      );
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* 🔥🔥 核心修复：添加 [&>button]:hidden 隐藏那个讨厌的默认关闭按钮 */}
      <DialogContent className="p-0 gap-0 bg-white max-w-[650px] overflow-hidden rounded-xl shadow-2xl border border-gray-100 [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>

        <InstantSearch searchClient={searchClient} indexName="messages">
          <Configure filters={`workspaceId:${workspaceId}`} />

          <div className="relative border-b border-gray-100 p-4">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-[#5d33a8]" />
            <SearchBox
              autoFocus
              classNames={{
                root: "w-full",
                form: "relative",
                input:
                  "w-full h-12 pl-12 pr-4 rounded-lg bg-gray-50 border-none text-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#5d33a8]/20 focus:bg-white transition-all outline-none shadow-inner",
                submit: "hidden",
                reset: "hidden",
              }}
              placeholder="Search messages, channels, or people..."
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar bg-white py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Messages
            </div>

            <Hits
              hitComponent={({ hit }) => (
                <Hit hit={hit} onClick={() => handleSelect(hit)} />
              )}
              classNames={{
                list: "space-y-1",
                item: "list-none",
              }}
            />
            <EmptyState />
          </div>
        </InstantSearch>

        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">Search by</span>
            <span className="text-xs font-bold text-[#003dff] flex items-center gap-0.5">
              <span className="size-3 bg-[#003dff] rounded-full inline-block"></span>
              Algolia
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm">
                ↵
              </kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm">
                esc
              </kbd>
              <span>to close</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
