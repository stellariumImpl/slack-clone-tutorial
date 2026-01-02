import { useEffect, useState } from "react";

// 泛型 Hook，处理任何类型的防抖
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设定定时器
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

    // 清理函数：如果在 delay 时间内 value 又变了，清除上一次的定时器
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
