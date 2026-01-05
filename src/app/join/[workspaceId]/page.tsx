"use client";

import { Button } from "@/components/ui/button";
import { useJoin } from "@/features/workspaces/api/use-join";
import { useGetWorkspaceInfo } from "@/features/workspaces/api/use-get-workspace-info";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import Link from "next/link";
import Image from "next/image";
import VerificationInput from "react-verification-input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { useMemo, useEffect } from "react";

const JoinPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { data, isLoading } = useGetWorkspaceInfo({ id: workspaceId });

  const { mutate, isPending } = useJoin();

  // 判断是否已经加入，如果是则跳转到工作区
  const isMember = useMemo(() => data?.isMember, [data?.isMember]);
  useEffect(() => {
    if (isMember) {
      router.replace(`/workspace/${workspaceId}`);
    }
  }, [isMember, router, workspaceId]);
  // 结束

  const handleCompleteJoin = (value: string) => {
    mutate(
      { workspaceId, joinCode: value },
      {
        onSuccess: (id) => {
          toast.success("Workspace joined successfully");
          router.replace(`/workspace/${id}`);
        },
        onError: () => {
          toast.error("Failed to join workspace");
        },
      }
    );
  };

  if (isLoading) {
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
    <div className="h-full flex flex-col gap-y-8 items-center justify-center bg-white p-8">
      <Image src="/Sydney.svg" alt="Logo" width={100} height={100} />
      <div className="flex flex-col gap-y-4 items-center justify-center max-w-md">
        <div className="flex flex-col gap-y-2 items-center justify-center">
          <h1 className="text-2xl font-bold inline-block max-w-[330px] truncate align-bottom">
            Join {data?.name}
          </h1>
          <p className="text-md text-muted-foreground">
            Enter the join code to join the workspace
          </p>
        </div>
        <VerificationInput
          onComplete={handleCompleteJoin}
          length={6}
          classNames={{
            container: cn(
              "flex gap-x-2",
              isPending && "opacity-50 cursor-not-allowed"
            ),
            character:
              "uppercase h-14 w-12 rounded-lg border-2 border-gray-200 flex items-center justify-center text-xl font-bold text-gray-400 transition-all duration-300",
            characterInactive: "bg-white",
            characterSelected:
              "border-[#5d33a8] text-[#5d33a8] bg-white scale-105 shadow-md shadow-[#5d33a8]/20",
            characterFilled: "bg-white text-black border-gray-400",
          }}
          autoFocus
        />
      </div>
      <div className="flex gap-x-4">
        <Button size="lg" variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default JoinPage;
