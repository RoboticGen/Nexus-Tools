"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function AuthButton() {
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 transition hover:bg-slate-50"
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
          {session.user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <span className="text-sm font-medium text-slate-700">
          {session.user?.name || session.user?.email}
        </span>
        <svg
          className={`h-4 w-4 transition ${isDropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isDropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg"
          role="menu"
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">
              {session.user?.name}
            </p>
            <p className="text-sm text-slate-600">{session.user?.email}</p>
          </div>

          {session.user?.roles && session.user.roles.length > 0 && (
            <div className="border-b border-slate-200 px-4 py-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Roles
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {session.user.roles.map((role) => (
                  <span
                    key={role}
                    className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={async () => {
              setIsDropdownOpen(false);
              await signOut({ redirect: true });
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            role="menuitem"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
