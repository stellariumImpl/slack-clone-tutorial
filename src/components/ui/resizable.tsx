"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      // 1. 基础样式：
      // w-[1px]: 改成 1px 看起来更精致（Slack/Discord 也是极细的线）
      // bg-black/5: 这里就是关键！给它一个 5% 透明度的黑色，既能看到分界，又不会太黑。
      // (如果你是深色模式，可以用 bg-white/5)
      "relative flex w-[1px] items-center justify-center bg-black/5 p-0 transition-all",

      // 2. 扩大鼠标感应区 (after:w-4)
      "after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",

      // 3. 交互样式：
      // 悬停或拖拽时，变成蓝色（或者你喜欢的主题色）
      "hover:bg-gray-300 data-[active]:bg-gray-300",

      className
    )}
    {...props}
  />
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
