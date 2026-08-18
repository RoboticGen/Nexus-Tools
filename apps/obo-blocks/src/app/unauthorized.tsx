"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/ui/status-page";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <StatusPage
      status="401"
      description="You don't have permission to access this resource."
      actions={
        <>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </>
      }
    />
  );
}
