"use client";

import { signIn } from "next-auth/react";

interface LoginButtonProps {
  callbackUrl?: string;
  className?: string;
  label?: string;
}

export function LoginButton({
  callbackUrl = "/",
  className = "rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700",
  label = "Sign In",
}: LoginButtonProps) {
  return (
    <button
      onClick={() => signIn("keycloak", { callbackUrl })}
      className={className}
    >
      {label}
    </button>
  );
}
