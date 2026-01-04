"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // 记得引入这个
} from "@/components/ui/dialog";
import { useCreateWorkspaceModal } from "../store/use-create-workspace-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateWorkspace } from "../api/use-create-workspace";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const CreateWorkspaceModal = () => {
  const router = useRouter();
  const [open, setOpen] = useCreateWorkspaceModal();
  const [name, setName] = useState("");
  const { mutate, isPending } = useCreateWorkspace();

  const handleClose = () => {
    setOpen(false);
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(
      { name },
      {
        onSuccess: (id) => {
          router.push(`/workspace/${id}`);
          handleClose();
          toast.success("Workspace created");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* EDstem 风格要点 1: 干净的白底，去除多余装饰 
         overflow-hidden 保证圆角内内容不溢出
      */}
      <DialogContent className="bg-white p-0 overflow-hidden text-black gap-0 max-w-md">
        {/* EDstem 风格要点 2: 头部与内容区分割
           加一个浅灰色背景 (bg-gray-50) 和底边框 (border-b)，解决“太空白”的感觉
        */}
        <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100">
          <DialogTitle className="font-bold text-lg">
            Create a new workspace
          </DialogTitle>
          {/* 简洁明了的文案 */}
          <DialogDescription className="text-gray-500 mt-1">
            A shared environment for your team to collaborate.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              {/* <label className="text-sm font-medium text-gray-700">Name</label> */}
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
                autoFocus
                minLength={3}
                // EDstem 风格要点 3: 输入框干净，Focus 时显示紫色
                className="h-10 text-base border-gray-300 focus-visible:ring-offset-0 focus-visible:ring-[#5d33a8]/20 focus-visible:border-[#5d33a8]"
                placeholder="e.g. 'Project Alpha', 'Dev Team'"
              />
              <p className="text-xs text-gray-400 text-right">
                min 3 characters
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={isPending}
                // EDstem 风格要点 4: 使用标志性的紫色
                // 这种深紫色配合白色非常专业
                className="bg-[#5d33a8] hover:bg-[#4a2885] text-white px-8 cursor-pointer"
              >
                Create
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
