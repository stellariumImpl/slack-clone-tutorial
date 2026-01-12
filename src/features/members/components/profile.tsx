import { Id } from "../../../../convex/_generated/dataModel";
import { useGetMember } from "../api/use-get-member";
import { Button } from "@/components/ui/button";
import {
  XIcon,
  Loader,
  AlertTriangle,
  MailIcon,
  TrashIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRemoveMember } from "../api/use-remove-member";
import { useUpdateMember } from "../api/use-update-member";
import { useCurrentMember } from "../api/use-current-member";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";

interface ProfileProps {
  memberId: Id<"members">;
  onClose: () => void;
}

export const Profile = ({ memberId, onClose }: ProfileProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const [LeaveDialog, confirmLeave] = useConfirm(
    "Leave workspace",
    "Are you sure you want to leave this workspace? You won't be able to access it again unless you are re-invited."
  );

  const [RemoveDialog, confirmRemove] = useConfirm(
    "Remove member",
    "Are you sure you want to remove this member? They will be removed from the workspace immediately."
  );

  const { data: currentMember, isLoading: isLoadingCurrentMember } =
    useCurrentMember({
      workspaceId,
    });

  const { data: member, isLoading: isLoadingMember } = useGetMember({
    id: memberId,
  });

  const { mutate: updateMember, isPending: isUpdatingMember } =
    useUpdateMember();
  const { mutate: removeMember, isPending: isRemovingMember } =
    useRemoveMember();

  const onRemove = async () => {
    const ok = await confirmRemove();
    if (!ok) return;

    removeMember(
      { id: memberId },
      {
        onSuccess: () => {
          // 🔥 核心修复：只保留跳转，删掉 onClose()
          toast.success("Member removed");
          router.replace(`/workspace/${workspaceId}`);
        },
        onError: () => {
          toast.error("Failed to remove member");
        },
      }
    );
  };

  const onUpdate = async (role: "admin" | "member") => {
    updateMember(
      { id: memberId, role },
      {
        onSuccess: () => {
          toast.success("Role updated");
        },
        onError: () => {
          toast.error("Failed to update role");
        },
      }
    );
  };

  const onLeave = async () => {
    const ok = await confirmLeave();
    if (!ok) return;

    removeMember(
      { id: memberId },
      {
        onSuccess: () => {
          // 🔥 核心修复：只保留跳转，删掉 onClose()
          toast.success("You left the workspace");
          router.replace("/");
        },
        onError: () => {
          toast.error("Failed to leave the workspace");
        },
      }
    );
  };

  // ... 渲染部分保持不变 ...
  if (isLoadingMember || isLoadingCurrentMember) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b bg-white">
          <p className="text-lg font-bold">Profile</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5]" />
          </Button>
        </div>
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b bg-white">
          <p className="text-lg font-bold">Profile</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5]" />
          </Button>
        </div>
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <AlertTriangle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const avatarFallBack = member.user.name?.[0] ?? "M";

  return (
    <>
      <RemoveDialog />
      <LeaveDialog />

      <div className="h-full flex flex-col bg-gray-50/50">
        <div className="flex justify-between items-center h-[49px] px-4 border-b bg-white shadow-sm shrink-0">
          <p className="text-lg font-bold">Profile</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5]" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center justify-center p-8 bg-white pb-4">
            <div className="relative">
              <Avatar className="size-36 border-0 border-white shadow-lg">
                <AvatarImage src={member.user.image} className="object-cover" />
                <AvatarFallback className="aspect-square text-6xl bg-sky-500 text-white">
                  {avatarFallBack}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="mt-4 flex flex-col items-center gap-1">
              <p className="text-2xl font-bold text-gray-900">
                {member.user.name}
              </p>
              <div
                className={cn(
                  "flex items-center gap-1 mt-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors select-none",
                  member.role === "admin"
                    ? "bg-[#2dd4bf]/10 text-[#0f766e] border-[#2dd4bf]/40 shadow-[0_1px_2px_rgba(45,212,191,0.2)]"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                )}
              >
                {member.role}
              </div>
            </div>
          </div>

          {currentMember?.role === "admin" &&
          currentMember?._id !== memberId ? (
            <div className="p-4 bg-white">
              <div className="flex items-center justify-center gap-3">
                <div className="w-full">
                  <Button
                    variant="outline"
                    className="w-full capitalize border-gray-300 shadow-sm"
                    disabled={isUpdatingMember}
                    onClick={() =>
                      onUpdate(member.role === "admin" ? "member" : "admin")
                    }
                  >
                    {member.role === "admin"
                      ? "Demote to Member"
                      : "Promote to Admin"}
                  </Button>
                </div>

                <div className="w-full">
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-sm"
                    onClick={onRemove}
                    disabled={isRemovingMember}
                  >
                    <TrashIcon className="size-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {currentMember?._id === memberId &&
          currentMember?.role !== "admin" ? (
            <div className="p-4 bg-white">
              <div className="flex items-center justify-center gap-3">
                <div className="w-full">
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-sm"
                    onClick={onLeave}
                    disabled={isRemovingMember}
                  >
                    Leave Workspace
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="px-3">
            <Separator className="bg-gray-200" />
          </div>

          <div className="flex flex-col p-4 mt-2">
            <p className="text-sm font-bold mb-4 text-gray-900">
              Contact information
            </p>

            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm group">
              <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <MailIcon className="size-5 text-gray-500 group-hover:text-blue-600" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-[13px] font-semibold text-muted-foreground">
                  Email Address
                </p>
                <Link
                  href={`mailto:${member.user.email}`}
                  className="text-sm font-medium text-[#1264a3] hover:underline truncate"
                >
                  {member.user.email}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
