import { Loader2 } from "lucide-react"

import { cn } from "@nexus-tools/design-system/lib/utils"

const sizes = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
  xl: "size-8",
}

/** Busy indicator. */
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
