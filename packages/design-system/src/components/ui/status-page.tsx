import { Lock, ServerCrash, SearchX, ShieldAlert, WifiOff } from "lucide-react"

import { cn } from "@nexus-tools/design-system/lib/utils"

import type { Tone } from "@nexus-tools/design-system/lib/tone"
import type { LucideIcon } from "lucide-react"

type Preset = {
  code: string
  title: string
  description: string
  icon: LucideIcon
  tone: Tone
}

/** The statuses that actually have a page. Each carries its own tone, so a 404 (expected, mundane) does not shout in the same red as a 500. */
const PRESETS = {
  "401": {
    code: "401",
    title: "Not signed in",
    description: "Sign in to continue.",
    icon: Lock,
    tone: "info",
  },
  "403": {
    code: "403",
    title: "No access",
    description: "Your account does not have permission to view this.",
    icon: ShieldAlert,
    tone: "warning",
  },
  "404": {
    code: "404",
    title: "Page not found",
    description: "The page you are looking for has moved or never existed.",
    icon: SearchX,
    tone: "neutral",
  },
  "500": {
    code: "500",
    title: "Something went wrong",
    description: "The problem is on our side. Try again in a moment.",
    icon: ServerCrash,
    tone: "danger",
  },
  offline: {
    code: "",
    title: "You are offline",
    description: "Check your connection and try again.",
    icon: WifiOff,
    tone: "neutral",
  },
} as const satisfies Record<string, Preset>

export type StatusPageStatus = keyof typeof PRESETS

type StatusPageProps = Omit<React.ComponentProps<"main">, "title"> & {
  status?: StatusPageStatus
  /** Each overrides the preset. */
  code?: string
  title?: string
  description?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  /** Buttons. Put the primary route first. */
  actions?: React.ReactNode
  /** Support reference, request id, contact link. */
  footer?: React.ReactNode
}

/** Full-page terminal state: 401, 403, 404, 500, offline. `unauthorized.tsx` is byte-identical across all three Nexus-Tools apps — hardcoded `slate`/`blue` with a `from-slate-100` gradient, so it ignores the theme entirely and renders a light page inside a dark app. */
function StatusPage({
  status = "404",
  code,
  title,
  description,
  icon,
  tone,
  actions,
  footer,
  className,
  ...props
}: StatusPageProps) {
  const preset = PRESETS[status]
  const Icon = icon ?? preset.icon
  const resolvedCode = code ?? preset.code

  return (
    <main
      data-slot="status-page"
      data-tone={tone ?? preset.tone}
      className={cn(
        "flex min-h-svh flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
      {...props}
    >
      <div
        data-appearance="soft"
        className="mb-6 flex size-14 items-center justify-center rounded-2xl border"
      >
        <Icon aria-hidden="true" className="size-7" />
      </div>

      {resolvedCode && (
        // aria-hidden because the heading below carries the meaning — "401" read aloud on its own tells a screen reader user nothing. It still has to meet contrast: WCAG 1.4.3 applies to text you can see, regardless of whether assistive tech is offered it, and axe rightly failed this at /60 (2.4:1).
        <p aria-hidden="true" className="text-muted-foreground/80 text-5xl font-bold tabular-nums">
          {resolvedCode}
        </p>
      )}

      <h1 className="mt-3 text-2xl font-semibold text-balance">{title ?? preset.title}</h1>

      <p className="text-muted-foreground mt-2 max-w-md text-sm text-pretty">
        {description ?? preset.description}
      </p>

      {actions && <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>}

      {footer && (
        <div className="text-muted-foreground mt-10 text-xs">{footer}</div>
      )}
    </main>
  )
}

export { StatusPage, PRESETS as STATUS_PAGE_PRESETS }
