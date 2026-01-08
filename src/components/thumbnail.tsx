/*eslint-disable @next/next/no-img-element*/
import { cn } from "@/lib/utils";

interface ImagesGridProps {
  images: string[] | null | undefined;
  onOpen: (index: number) => void;
}

export const ImagesGrid = ({ images, onOpen }: ImagesGridProps) => {
  if (!images || images.length === 0) {
    return null;
  }

  // 1. 切片：最多只取前 4 张用于显示
  const visibleImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  // 2. 布局逻辑：根据图片数量动态调整 Grid 列数
  // 1张: 1列; 2张: 2列; 3-4张: 2列; 5张+: 2列 (保持四宫格样式)
  const gridCols =
    images.length === 1
      ? "grid-cols-1 max-w-[360px]"
      : "grid-cols-2 max-w-[360px]";

  return (
    <div className={cn("grid gap-2 mt-2", gridCols)}>
      {visibleImages.map((url, index) => {
        // 判断是否是最后一张可见图，且后面还有剩余图片
        const isLastVisible = index === 3 && remainingCount > 0;

        return (
          <div
            key={url}
            onClick={() => onOpen(index)}
            className={cn(
              "relative overflow-hidden rounded-xl cursor-zoom-in group border border-gray-100/10",
              // 如果是单张图，限制高度比例；如果是多张图，用正方形比例
              images.length === 1 ? "aspect-[16/9]" : "aspect-square"
            )}
          >
            <img
              src={url}
              alt={`Attachment ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* 悬停时的轻微遮罩 */}
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

            {/* +X 数字遮罩 (只在最后一张且有剩余图片时显示) */}
            {isLastVisible && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-medium text-xl hover:bg-black/40 transition-colors">
                +{remainingCount + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
