import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { createContext, useContext } from "react"

import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import type { VariantProps } from "class-variance-authority"

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({
  variant: "default",
  size: "default",
})

/**
 * A segmented control — one selection from a small, always-visible set.
 *
 * `leaderboard.tsx` hand-rolls this shape twice, once for desktop and once
 * for mobile, as a pair of manually-styled `<button>`s with no shared state
 * management. Built on Radix, so arrow-key roving focus and `aria-pressed`
 * come for free.
 */
function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = useContext(ToggleGroupContext)
  const resolvedVariant = context.variant ?? variant
  const resolvedSize = context.size ?? size

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      className={cn(
        toggleVariants({ variant: resolvedVariant, size: resolvedSize }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none focus:z-10 focus-visible:z-10 first:rounded-l-md last:rounded-r-md data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
