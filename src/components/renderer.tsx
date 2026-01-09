import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RendererProps {
  value: string; // Tiptap 存的是 HTML 字符串
}

const Renderer = ({ value }: RendererProps) => {
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (!value) {
      setIsEmpty(true);
      return;
    }

    // Tiptap 的空内容通常是 "<p></p>"
    // 我们创建一个临时的 DOM 元素来提取纯文本，判断是否真的为空
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const bodyText = doc.body.textContent || "";

    // 如果纯文本去除空格后长度为0，且不包含图片（虽然你的图片是单独传的，但为了健壮性保留判断），则视为空
    // 注意：因为你的图片是单独上传并存储在 images 字段的，所以这里 body 里通常没有 img 标签
    const hasImage = doc.querySelector("img");

    setIsEmpty(bodyText.trim().length === 0 && !hasImage);
  }, [value]);

  if (isEmpty) return null;

  return (
    <div
      // "tiptap" 类名是为了保持和编辑器一致的样式（如果你在 globals.css 里定义了）
      // "prose" 是 Tailwind Typography 插件，能自动美化 HTML 内容（列表、引用等）
      className={cn(
        "tiptap prose w-full wrap-break-word shrink-0",
        // 覆盖一些 prose 的默认样式，使其更适合聊天气泡
        "prose-p:leading-normal prose-p:my-0 prose-p:text-sm",
        "prose-ul:my-0 prose-ul:list-disc prose-ul:pl-4",
        "prose-ol:my-0 prose-ol:list-decimal prose-ol:pl-4"
      )}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
};

export default Renderer;
