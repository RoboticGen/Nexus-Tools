import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const sizes = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
  xl: "size-8",
}

/**
 * Busy indicator.
 *
 * Thin over lucide's `Loader2`, but worth owning: obo-nexus had a hand-inlined
 * SVG spinner used in six places *and* raw `Loader2` used in four others, at
 * five different sizes and with no accessible name anywhere. This fixes the
 * size scale and always announces itself.
 *
 * Pass `label` when the spinner is the only thing on screen. Inside a control
 * that already says what is happening ("Saving…"), leave it — the default is
 * `aria-hidden` so screen readers do not hear "loading" twice.
 */
function Spinner({
  className,
  size = "md",
  label,
  ...props
}: React.ComponentProps<"svg"> & {
  size?: keyof typeof sizes
  label?: string
}) {
  return (
    <Loader2
      data-slot="spinner"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("animate-spin", sizes[size], className)}
      {...props}
    />
  )
}

export { Spinner }
