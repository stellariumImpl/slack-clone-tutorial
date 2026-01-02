"use client";
import { useState } from "react";
import { SignInFlow } from "../types";
import { SignInCard } from "./sign-in-card";
import { SignUpCard } from "./sign-up-card";
// 这个的含义是标注这是一个react component，而不是react 服务器组件

export const AuthScreen = () => {
  const [state, setState] = useState<SignInFlow>("signIn");

  return (
    // 修改点 1：背景颜色
    // bg-white: 手机端背景纯白 (配合卡片的无边框，融为一体)
    // md:bg-[#5D33A8]: 电脑端背景变回紫色
    <div className="h-full flex items-center justify-center bg-white md:bg-[#5D33A8]">
      {/* 修改点 2：容器尺寸
          md:h-auto: 电脑端高度自适应
          md:w-[420px]: 电脑端限制宽度为 420px
          (手机端默认会是 w-full，不用特意写) 
      */}
      <div className="md:h-auto md:w-[420px]">
        {state === "signIn" ? (
          <SignInCard setState={setState} />
        ) : (
          <SignUpCard setState={setState} />
        )}
      </div>
    </div>
  );
};
