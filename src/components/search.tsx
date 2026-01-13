"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCreateOrGetConversations } from "@/features/conversations/api/use-create-or-get-conversations";

interface SearchProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const Search = ({ open, setOpen }: SearchProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { data: channels } = useGetChannels({ workspaceId });
  const { data: members } = useGetMembers({ workspaceId });
  const { mutate: createConversation } = useCreateOrGetConversations();

  // 监听键盘快捷键 Cmd+K 也可以打开
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const onSelectChannel = (id: string) => {
    setOpen(false);
    router.push(`/workspace/${workspaceId}/channel/${id}`);
  };

  const onSelectMember = (id: string) => {
    setOpen(false); // 立即关闭，提升体验
    createConversation(
      { workspaceId, memberId: id as any },
      {
        onSuccess(conversationId) {
          if (conversationId) {
            router.push(`/workspace/${workspaceId}/member/${id}`);
          }
        },
      }
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Channels">
          {channels?.map((channel) => (
            <CommandItem
              key={channel._id}
              onSelect={() => onSelectChannel(channel._id)}
            >
              <span># {channel.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Members">
          {members?.map((member) => (
            <CommandItem
              key={member._id}
              onSelect={() => onSelectMember(member._id)}
            >
              <span>{member.user?.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
