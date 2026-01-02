import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// 注意：这里去掉了 Radix 的 Separator，改用手写 CSS 实现带文字的分割线
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { SignInFlow } from "../types";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

import { Check, Loader2, XCircle } from "lucide-react"; // 引入图标
import { cn } from "@/lib/utils"; // 工具函数，shadcn 自带的

import { useQuery } from "convex/react"; // 1. 引入 useQuery
import { api } from "../../../../convex/_generated/api"; // 2. 引入 api 定义
import { useDebounce } from "../api/use-debounce"; // 3. 引入防抖 hook

interface SignUpCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignUpCard = ({ setState }: SignUpCardProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { signIn } = useAuthActions();

  const [pending, setPending] = useState(false);

  const [error, setError] = useState("");

  // --- 实时邮箱检测逻辑 ---

  // 1. 获取防抖后的email（延迟500ms）
  const debouncedEmail = useDebounce(email, 500);

  // 2. 只有当邮箱的格式基本正确时，才去查询数据库，节省资源
  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);

  // 3. 使用convex query 查询是否存在（当email为空，或者格式不对时，跳过查询）
  const existingUser = useQuery(
    api.users.checkEmailUnique,
    isEmailFormatValid ? { email: debouncedEmail } : "skip"
  );

  // 4. 判断是否正在加载检查 (输入了值，格式对，但防抖值还没同步 或 Query 还在 loading)
  // 注意：useQuery 返回 undefined 代表正在加载
  const isCheckingEmail =
    isEmailFormatValid &&
    (debouncedEmail !== email || existingUser === undefined);

  // --- 结束 ---

  const validations = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "Contains a number",
      valid: /\d/.test(password),
    },
    {
      label: "Contains a special char (!@#$)", // 包含特殊字符
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  // 计算是否所有规则都通过
  const isPasswordValid = validations.every((v) => v.valid);
  const isConfirmValid = password === confirmPassword && password.length > 0;

  // 只有当密码合规，且两次输入一致时，按钮才可用
  // 核心拦截：如果邮箱已存在 (existingUser === true)，禁止提交
  const canSubmit =
    !isCheckingEmail &&
    existingUser !== true &&
    isPasswordValid &&
    isConfirmValid &&
    email.length > 0 &&
    !pending;

  const onPasswordSignUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (existingUser) {
      setError("Email already in use");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setPending(true);
    signIn("password", { name, email, password, flow: "signUp" })
      .catch(() => {
        setError("Something went wrong");
      })
      .finally(() => {
        setPending(false);
      });
  };

  const onProviderSignUp = (value: "github" | "google") => {
    setPending(true);
    // signIn(value).finally(() => {
    //   setPending(false);
    // });
    signIn(value).catch((error) => {
      // 新增：只有报错了才停止转圈，并打印错误
      console.error("OAuth Error:", error);
      setError("Something went wrong, please try again."); // 给用户一个提示
      setPending(false);
    });
  };

  return (
    <Card className="w-full h-full md:h-auto p-8 border-none shadow-none md:border md:shadow-md">
      {/* 1. 头部居中，模仿 Clerk 的干净标题 */}
      <CardHeader className="px-0 pt-0 text-center mb-2">
        <CardTitle className="text-xl font-bold tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription className="text-slate-500">
          Welcome! Please fill in the details to get started.
        </CardDescription>
      </CardHeader>
      {/* {!!error && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          <p>{error}</p>
        </div>
      )} */}
      <CardContent className="space-y-6 px-0 pb-0">
        {/* 2. 社交按钮提到最前面 */}
        <div className="flex flex-col gap-y-3">
          <Button
            disabled={pending}
            onClick={() => onProviderSignUp("google")}
            variant="outline"
            size="lg"
            className="w-full relative font-medium"
          >
            <FcGoogle className="size-5 absolute left-3" />
            Continue with Google
          </Button>

          <Button
            disabled={pending}
            onClick={() => onProviderSignUp("github")}
            variant="outline"
            size="lg"
            className="w-full relative font-medium"
          >
            <FaGithub className="size-5 absolute left-3" />
            Continue with Github
          </Button>
        </div>

        {/* 3. 带文字的分割线 "Or continue with" */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            {/* bg-background 确保文字背景盖住线条 */}
            <span className="bg-white px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {/* 4. 表单放在下面 */}
        <form onSubmit={onPasswordSignUp} className="space-y-4">
          {/* 修改开始：加一个 div 包裹，为了不破坏 space-y-4 的间距 */}
          <div className="space-y-1">
            {/* 1. 定位容器：只包含 Input 和 Icon，确保居中计算准确 */}
            {/* 邮箱输入框容器 */}
            <div className="relative">
              <Input
                disabled={pending}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // 用户正在修改邮箱时，如果之前有“邮箱已存在”的报错，应该清空，提升体验
                  if (error === "Email already in use") setError("");
                }}
                placeholder="Email address"
                type="email"
                required
                className={cn(
                  "h-10",
                  // 如果邮箱已存在，输入框边框变红
                  // 修改点 1：加上 && !pending
                  // 只有在非提交状态下，才显示红色边框
                  existingUser === true &&
                    !isCheckingEmail &&
                    !pending &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />
              {/* 右侧的指示图标 (Loading 或 报错) */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {isCheckingEmail ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : existingUser === true && !pending ? ( // 修改点 2：加上 && !pending
                  // 邮箱已被占用
                  // 只有在非提交状态下，才显示红叉
                  <XCircle className="size-4 text-destructive" />
                ) : null}
              </div>
            </div>

            {/* 修改点 3：加上 && !pending */}
            {/* 只有在非提交状态下，才显示文字报错 */}
            {existingUser === true && !isCheckingEmail && !pending && (
              <p className="text-xs text-destructive font-medium text-right">
                Email already in use
              </p>
            )}
          </div>
          {/* 修改结束 */}

          <Input
            disabled={pending}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nickname"
            required
            className="h-10"
          />

          <Input
            disabled={pending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
            className="h-10"
          />

          {/* 只有当用户开始输入密码时才显示这个提示框 */}
          {password.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 transition-all duration-300">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Password requirements:
              </p>
              <ul className="space-y-1">
                {validations.map((rule, index) => (
                  <li key={index} className="flex items-center gap-2 text-xs">
                    {/* 根据规则是否满足，动态切换图标和颜色 */}
                    <div
                      className={cn(
                        "flex items-center justify-center size-4 rounded-full border transition-colors",
                        rule.valid
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 text-transparent"
                      )}
                    >
                      <Check className="size-3 font-bold" />
                    </div>
                    <span
                      className={cn(
                        "transition-colors",
                        rule.valid
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Input
            disabled={pending}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            type="password"
            required
            className="h-10"
          />

          <Button
            type="submit"
            className="w-full h-10 font-semibold"
            size="lg"
            // 这里我们使用 canSubmit 来控制按钮，而不是仅仅靠 pending
            // 这样用户如果不满足密码规则，根本按不了按钮
            disabled={!canSubmit}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign Up
          </Button>
        </form>

        {/* 5. 底部文字居中 */}
        <p className="text-xs text-muted-foreground text-center px-4">
          Already have an account?{" "}
          <span
            onClick={() => setState("signIn")}
            className="text-sky-700 hover:underline cursor-pointer font-medium"
          >
            Sign In
          </span>
        </p>
      </CardContent>
    </Card>
  );
};
