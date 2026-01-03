"use client";

import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

// import { use } from "react";

// interface WorkspaceIdPageProps {
//   params: Promise<{
//     // 类型改成 Promise
//     workspaceId: string;
//   }>;
// }

// const WorkspaceIdPage = ({ params }: WorkspaceIdPageProps) => {
//   // 使用 use() 解包 Promise，拿到真正的 id
//   const { workspaceId } = use(params);

//   return <div>ID: {workspaceId}</div>;
// };

const WorkspaceIdPage = () => {
  const workspaceId = useWorkspaceId();
  const { data } = useGetWorkspace({ id: workspaceId });
  return (
    <div>
      WorkspaceIdPage
      <div>Data:{JSON.stringify(data)}</div>
    </div>
  );
};

export default WorkspaceIdPage;
