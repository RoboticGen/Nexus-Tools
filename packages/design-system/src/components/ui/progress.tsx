"use client"

import { Progress as ProgressPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@nexus-tools/design-system/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      // `value` must reach Radix, not just the transform below. Upstream shadcn destructures it and forwards only the style, so Root sees `undefined`, treats the bar as indeterminate and emits no aria-valuenow/min/max — a bar that renders but reports nothing.
      value={value}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        // `bg-[var(--tone,…)]` rather than `bg-primary` plus a components-layer override: `data-tone` sets `--tone`, but a plain `bg-primary` utility would beat any rule in the components layer, so the bar stayed teal for every tone. One utility with a fallback settles it in the same layer.
        className="size-full flex-1 bg-[var(--tone,var(--primary))] transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
