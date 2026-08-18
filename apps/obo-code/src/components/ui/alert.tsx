import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Tone } from "@/lib/tone"

const TONE_ICONS: Record<Tone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  brand: Info,
}

type AlertProps = React.ComponentProps<"div"> & {
  /** Semantic weight. Default `neutral` reads as a plain notice. */
  tone?: Tone
  /**
   * Leading icon. `true` (default) picks one from `tone`; pass an element for
   * a custom icon, or `false` for none. Always `aria-hidden` — the tone is
   * carried by the visible text, not by which glyph is showing.
   */
  icon?: React.ReactNode | boolean
}

/**
 * A stationary, always-visible message about the surrounding content — not a
 * transient one. For something that appears and dismisses on its own, use
 * `sonner`; for a confirmation the user must act on, use `AlertDialog`.
 *
 * obo-nexus's version had a `variant: "default" | "destructive"` prop, which
 * gave it exactly one colour to raise an alarm with. `subscription-locked.tsx`
 * needed amber and hand-overrode the classes at the call site rather than
 * getting a third variant. Every non-neutral state here is a `tone` — the
 * same axis `Badge`, `StatusBadge` and `Progress` already share — so a new
 * shade of concern is a prop value, not a new component branch.
 */
function Alert({ className, tone = "neutral", icon = true, children, ...props }: AlertProps) {
  const Icon = icon === true ? TONE_ICONS[tone] : null
  const custom = icon !== true && icon !== false ? icon : null

  return (
    <div
      data-slot="alert"
      data-tone={tone}
      data-appearance="soft"
      role="alert"
      className={cn("flex w-full items-start gap-2.5 rounded-lg border px-4 py-3 text-sm", className)}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
      {custom && (
        <span aria-hidden="true" className="mt-0.5 shrink-0 [&_svg]:size-4">
          {custom}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">{children}</div>
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("leading-none font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
export type { AlertProps }
