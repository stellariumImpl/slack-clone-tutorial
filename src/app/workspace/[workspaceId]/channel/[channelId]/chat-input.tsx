"use client";

import Editor from "@/components/editor";

// 接收外部传入的 placeholder，让它更通用
interface ChatInputProps {
  placeholder: string;
}

export const ChatInput = ({ placeholder }: ChatInputProps) => {
  // 处理发送逻辑
  const handleSend = ({ body }: { body: string }) => {
    // 目前先打印到控制台，下一步我们在这里调用后端 API
    console.log("准备发送消息:", body);
  };

  return (
    <div className="pb-[10px] px-5 w-full">
      <Editor
        variant="create" // 现在写死，后面调整
        placeholder={placeholder}
        onSubmit={handleSend}
      />
    </div>
  );
};
