import { FaChevronDown } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrashIcon, Video } from "lucide-react"; // 🔥 1. 引入 Video 图标
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { useState } from "react";
import { useChannelId } from "@/hooks/use-channel-id";
import { useUpdateChannel } from "@/features/channels/api/use-update-channel";
import { useRemoveChannel } from "@/features/channels/api/use-remove-channel";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";

interface HeaderProps {
  name: string;
  onCall?: () => void; // 🔥 2. 新增 onCall 类型定义
}

export const Header = ({ name, onCall }: HeaderProps) => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [editOpen, setEditOpen] = useState(false);

  const { data: currentMember } = useCurrentMember({ workspaceId });

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure you want to delete this channel?",
    "You are about to delete this channel. This action is irreversible."
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, "-").toLowerCase();
    setValue(value);
  };

  const channelId = useChannelId();

  const { mutate: updateChannel, isPending: isUpdateChannelPending } =
    useUpdateChannel();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateChannel(
      { id: channelId, name: value },
      {
        onSuccess: () => {
          toast.success("Channel updated successfully");
          setEditOpen(false);
        },
        onError: () => {
          toast.error("Failed to update channel");
        },
      }
    );
  };

  const { mutate: removeChannel, isPending: isRemoveChannelPending } =
    useRemoveChannel();

  const handleRemove = async () => {
    const ok = await confirm();
    if (!ok) return;
    removeChannel(
      { id: channelId },
      {
        onSuccess: () => {
          toast.success("Channel removed successfully");
          router.replace(`/workspace/${workspaceId}`);
        },
        onError: () => {
          toast.error("Failed to remove channel");
        },
      }
    );
  };

  const handleEditOpen = (value: boolean) => {
    if (currentMember?.role !== "admin") return;
    setEditOpen(value);
  };

  return (
    <div className="bg-white border-b h-[49px] flex items-center px-4 overflow-hidden justify-between">
      {/* 左侧：标题和编辑弹窗 */}
      <div className="flex items-center">
        <ConfirmDialog />
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="text-lg font-semibold px-2 overflow-hidden w-auto"
              size="sm"
            >
              <span className="truncate"># {name}</span>
              <FaChevronDown className="size-2.5 ml-2" />
            </Button>
          </DialogTrigger>
          <DialogContent className="p-0 bg-gray-50 overflow-hidden">
            <DialogHeader className="p-4 border-b bg-white">
              <DialogTitle># {name}</DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 flex flex-col gap-y-2">
              <Dialog open={editOpen} onOpenChange={handleEditOpen}>
                <DialogTrigger asChild>
                  <div className="px-5 py-4 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Channel name</p>
                      {currentMember?.role === "admin" && (
                        <p className="text-sm text-[#5d33a8] hover:underline font-semibold hover:text-[#4a2885] transition-colors">
                          Edit
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500"># {name}</p>
                  </div>
                </DialogTrigger>
                <DialogContent className="p-0 bg-white overflow-hidden max-w-md gap-0 text-black">
                  <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100">
                    <DialogTitle className="font-bold text-lg">
                      Rename this channel
                    </DialogTitle>
                  </DialogHeader>

                  <form className="space-y-4 p-6" onSubmit={handleSubmit}>
                    <Input
                      value={value}
                      disabled={isUpdateChannelPending}
                      onChange={handleChange}
                      required
                      autoFocus
                      minLength={3}
                      maxLength={80}
                      placeholder="e.g. plan-budget"
                      className="h-10 text-base border-gray-300 focus-visible:ring-offset-0 focus-visible:ring-[#5d33a8]/20 focus-visible:border-[#5d33a8]"
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button
                          variant="outline"
                          disabled={isUpdateChannelPending}
                          className="cursor-pointer text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        disabled={isUpdateChannelPending}
                        className="cursor-pointer bg-[#5d33a8] hover:bg-[#4a2885] text-white"
                      >
                        Save changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {currentMember?.role === "admin" && (
                <button
                  onClick={handleRemove}
                  disabled={isRemoveChannelPending}
                  className="flex items-center gap-x-2 px-5 py-4 bg-white rounded-lg cursor-pointer border hover:bg-gray-50 text-rose-600"
                >
                  <TrashIcon className="size-4" />
                  <p className="text-sm font-semibold">Delete channel</p>
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 🔥 3. 右侧：视频通话按钮 */}
      {onCall && (
        <Button
          onClick={onCall}
          variant="ghost"
          size="iconSm"
          className="text-muted-foreground hover:text-[#5d33a8]"
        >
          <Video className="size-5" />
        </Button>
      )}
    </div>
  );
};
