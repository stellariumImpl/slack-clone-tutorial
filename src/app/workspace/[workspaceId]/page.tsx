"use client";

import { use } from "react";

interface WorkspaceIdPageProps {
  params: Promise<{
    // 类型改成 Promise
    workspaceId: string;
  }>;
}

const WorkspaceIdPage = ({ params }: WorkspaceIdPageProps) => {
  // 使用 use() 解包 Promise，拿到真正的 id
  const { workspaceId } = use(params);

  return <div>ID: {workspaceId}</div>;
};

export default WorkspaceIdPage;
