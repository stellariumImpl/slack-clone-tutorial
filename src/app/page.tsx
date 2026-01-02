"use client";

import { useAuthActions } from "@convex-dev/auth/react";

import { Button } from "@/components/ui/button";

import { UserButton } from "@/features/auth/components/user-button";

export default function Home() {
  const { signOut } = useAuthActions();

  return (
    <div>
      Logged in!
      <UserButton />
      <Button onClick={signOut}>退出</Button>
    </div>
  );
}
