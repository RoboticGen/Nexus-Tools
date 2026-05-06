"use client";

import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-slate-900">401</h1>
          <p className="mt-4 text-2xl font-semibold text-slate-700">
            Unauthorized
          </p>
          <p className="mt-2 text-slate-600">
            You don't have permission to access this resource.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/login")}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Go to Login
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
