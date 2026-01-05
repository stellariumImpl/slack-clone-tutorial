import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useUpdateWorkspace } from "@/features/workspaces/api/use-update-workspace";
import { useRemoveWorkspace } from "@/features/workspaces/api/use-remove-workspace";

import { useWorkspaceId } from "@/hooks/use-workspace-id";

import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";

interface PreferenceModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialValue: string;
}

export const PreferencesModal = ({
  open,
  setOpen,
  initialValue,
}: PreferenceModalProps) => {
  const router = useRouter();

  const workspaceId = useWorkspaceId();

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "This action is irreversible."
  );

  const [value, setValue] = useState(initialValue);
  const [eidtOpen, setEditOpen] = useState(false);

  const { mutate: updateWorkspace, isPending: isUpdatingWorkspace } =
    useUpdateWorkspace();
  const { mutate: removeWorkspace, isPending: isRemovingWorkspace } =
    useRemoveWorkspace();

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateWorkspace(
      {
        id: workspaceId,
        name: value,
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          toast.success("Workspace updated");
        },
        onError: () => {
          toast.error("Failed to update workspace");
        },
      }
    );
  };

  const handleRemove = async () => {
    const confirmed = await confirm();
    if (!confirmed) return;
    removeWorkspace(
      {
        id: workspaceId,
      },
      {
        onSuccess: () => {
          toast.success("Workspace removed");
          router.replace("/");
        },
        onError: () => {
          toast.error("Failed to remove workspace");
        },
      }
    );
  };

  return (
    <>
      <ConfirmDialog />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 bg-white overflow-hidden max-w-md gap-0 text-black">
          <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100">
            <DialogTitle className="font-bold text-lg inline-block max-w-[330px] truncate align-bottom">
              {value}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Manage your workspace settings and preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 flex flex-col gap-y-6">
            <Dialog open={eidtOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <div className="px-5 py-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-900">
                      Workspace name
                    </p>
                    <p className="text-sm text-[#5d33a8] hover:underline font-semibold hover:text-[#4a2885] transition-colors">
                      Edit
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 inline-block max-w-[330px] truncate align-bottom">
                    {value}
                  </p>
                </div>
              </DialogTrigger>

              {/* 复制外层的样式 (p-0, max-w-md, bg-white) 确保大小风格完全一致 */}
              <DialogContent className="p-0 bg-white overflow-hidden max-w-md gap-0 text-black">
                {/* Header 加上灰底和边框 */}
                <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100">
                  <DialogTitle className="font-bold text-lg">
                    Rename this workspace
                  </DialogTitle>
                </DialogHeader>

                {/* 给 form 加上 p-6 补回内边距 */}
                <form className="space-y-4 p-6" onSubmit={handleEdit}>
                  <Input
                    value={value}
                    disabled={isUpdatingWorkspace}
                    onChange={(e) => setValue(e.target.value)}
                    required
                    autoFocus
                    minLength={3}
                    maxLength={80}
                    placeholder="e.g. 'Project Alpha', 'Dev Team'"
                    // 输入框 Focus 变紫
                    className="h-10 text-base border-gray-300 focus-visible:ring-offset-0 focus-visible:ring-[#5d33a8]/20 focus-visible:border-[#5d33a8]"
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        variant="outline"
                        disabled={isUpdatingWorkspace}
                        // 取消按钮文字稍微灰一点
                        className="cursor-pointer text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      disabled={isUpdatingWorkspace}
                      // 保存按钮改成紫色
                      className="cursor-pointer bg-[#5d33a8] hover:bg-[#4a2885] text-white"
                    >
                      Save changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <button
              onClick={handleRemove}
              disabled={isRemovingWorkspace}
              className="flex items-center gap-x-2 px-5 py-4 bg-white rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-100 transition-colors cursor-pointer group"
            >
              <Trash className="size-4 text-rose-500" />
              <p className="text-sm font-semibold text-rose-500 group-hover:text-rose-600">
                Delete this workspace
              </p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
