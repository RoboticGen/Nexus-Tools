"use client";

import { useRouter } from "next/navigation";

import { Button } from "@nexus-tools/design-system/components/ui/button";
import { StatusPage } from "@nexus-tools/design-system/components/ui/status-page";

/** The 401 page, shared by all three apps. `StatusPage` keeps the number decorative so the message is the heading. */
export function UnauthorizedPage() {
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
