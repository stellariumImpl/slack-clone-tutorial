import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { SignInFlow } from "../types";
import { useState } from "react";

import { useAuthActions } from "@convex-dev/auth/react";

import { TriangleAlert, Loader2 } from "lucide-react";

interface SignInCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignInCard = ({ setState }: SignInCardProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signIn } = useAuthActions();

  const [pending, setPending] = useState(false);

  const [error, setError] = useState("");

  const onPasswordSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // --- 新增逻辑：手动检查空值 ---
    // 因为禁用了浏览器默认验证，我们需要自己判断
    if (!email.trim() || !password.trim()) {
      setError("Please fill out all fields"); // 这里会触发红框显示
      return;
    }

    setPending(true);
    signIn("password", { email, password, flow: "signIn" })
      .catch(() => {
        setError("Invalid email or password");
      })
      .finally(() => {
        setPending(false);
      });
  };

  const handleProviderSignIn = (value: "github" | "google") => {
    setPending(true);
    // --- 修改：去掉.finally ---
    // signIn(value).finally(() => {
    //   setPending(false);
    // });

    signIn(value).catch((error) => {
      // 新增：捕获错误
      console.error("OAuth Error:", error);
      setError("Something went wrong, please try again.");
      setPending(false);
    });
  };

  return (
    <Card className="w-full h-full md:h-auto p-8 border-none shadow-none md:border md:shadow-md">
      {/* 1. 标题居中，增加亲和力 */}
      <CardHeader className="px-0 pt-0 text-center mb-2">
        <CardTitle className="text-xl md:text-2xl font-bold tracking-tight">
          Login to continue
        </CardTitle>
        <CardDescription className="text-slate-500">
          Welcome back! Please enter your details.
        </CardDescription>
      </CardHeader>

      {!!error && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          <p>{error}</p>
        </div>
      )}

      <CardContent className="space-y-6 px-0 pb-0">
        {/* 2. 社交按钮提到最前面，垂直排列 */}
        <div className="flex flex-col gap-y-3">
          <Button
            disabled={pending}
            onClick={() => handleProviderSignIn("google")}
            variant="outline"
            size="lg"
            className="w-full relative font-medium"
          >
            <FcGoogle className="size-5 absolute left-3" />
            Continue with Google
          </Button>

          <Button
            disabled={pending}
            onClick={() => handleProviderSignIn("github")}
            variant="outline"
            size="lg"
            className="w-full relative font-medium"
          >
            <FaGithub className="size-5 absolute left-3" />
            Continue with Github
          </Button>
        </div>

        {/* 3. 带文字的分割线 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">
              Or login with email
            </span>
          </div>
        </div>

        {/* 关键修改：
            1. 加上 noValidate：这是禁用浏览器自带气泡的核心。
            2. required 属性虽然还在 Input 上（为了语义化），但浏览器不会再弹窗了。
        */}
        {/* 4. 邮箱表单放在下面 */}
        <form onSubmit={onPasswordSignIn} className="space-y-4" noValidate>
          <Input
            disabled={pending}
            value={email}
            // 当用户重新开始输入时，清空之前的报错，体验更好
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="Email address"
            type="email"
            required
            className="h-10"
          />
          <Input
            disabled={pending}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Password"
            type="password"
            required
            className="h-10"
          />

          <Button
            type="submit"
            className="w-full h-10 font-semibold"
            size="lg"
            disabled={pending}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Continue
          </Button>
        </form>

        {/* 5. 底部切换链接 */}
        <p className="text-xs text-muted-foreground text-center px-4">
          Don't have an account?{" "}
          <span
            onClick={() => setState("signUp")}
            className="text-sky-700 hover:underline cursor-pointer font-medium"
          >
            Sign Up
          </span>
        </p>
      </CardContent>
    </Card>
  );
};
