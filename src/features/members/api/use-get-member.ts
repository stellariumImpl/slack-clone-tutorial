import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

import { Id } from "../../../../convex/_generated/dataModel";

interface UseGetMemberProps {
  id: Id<"members">;
}

export const useGetMember = ({ id }: UseGetMemberProps) => {
  // 🔥 核心修改：如果 id 不存在，传入 "skip" 跳过查询，防止 ArgumentValidationError
  const data = useQuery(api.members.getById, id ? { id } : "skip");

  const isLoading = data === undefined;

  return { data, isLoading };
};
