import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

import type { Appearance, Tone } from "@/lib/tone"

const badgeVariants = cva(
  // `border` sets width only — the colour comes from the variant, or for a
  // toned badge from the `[data-appearance]` rules in the theme. Putting
  // `border-transparent` in the base would break toned badges: it compiles to
  // a utility, and Tailwind's utilities layer wins over the components layer
  // the tone rules live in.
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        // Stock shadcn pairs `text-destructive` with a 10% tint of itself,
        // which lands at 4.13:1 on our palette — a real AA failure the a11y
        // test caught. --tone-danger-contrast is the same hue derived to be
        // readable on exactly that tint.
        destructive:
          "border-transparent bg-[color-mix(in_oklab,var(--tone-danger)_12%,transparent)] text-[var(--tone-danger-contrast)] focus-visible:ring-destructive/20 [a]:hover:bg-[color-mix(in_oklab,var(--tone-danger)_20%,transparent)]",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "border-transparent hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        // Not `text-primary`: brand teal on white is 3.2:1 and fails as text.
        // --tone-brand-contrast is the darkened teal meant for type.
        link: "border-transparent text-[var(--tone-brand-contrast)] underline-offset-4 hover:underline",
        /**
         * Contributes no colour at all — `data-tone` and `data-appearance`
         * paint it. Selected automatically when `tone` is passed; not meant to
         * be set by hand.
         */
        toned: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type BadgeProps = React.ComponentProps<"span"> &
  Omit<VariantProps<typeof badgeVariants>, "variant"> & {
    variant?: Exclude<
      NonNullable<VariantProps<typeof badgeVariants>["variant"]>,
      "toned"
    >
    asChild?: boolean
    /**
     * Semantic weight. Setting this switches the badge onto the tone system
     * and `variant` is ignored — the two are alternative ways to colour it.
     */
    tone?: Tone
    /** How much visual weight the tone gets. Only used alongside `tone`. */
    appearance?: Appearance
    /** Renders a leading tone-coloured dot. Implied by `appearance="dot"`. */
    dot?: boolean
  }

/**
 * A label for status, category or count.
 *
 * Two ways to colour it, deliberately kept separate:
 *
 * - `variant` — the shadcn surface roles (`default`, `secondary`, `outline`…).
 * - `tone` + `appearance` — the semantic scale. Prefer this for anything that
 *   means something: `<Badge tone="success">Completed</Badge>`.
 *
 * Reach for `<StatusBadge>` instead when the input is a raw status string; it
 * handles the mapping and the label.
 */
function Badge({
  className,
  variant,
  tone,
  appearance = "soft",
  dot,
  asChild = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"
  const toned = tone !== undefined
  const showDot = dot ?? appearance === "dot"

  return (
    <Comp
      data-slot="badge"
      data-variant={toned ? undefined : (variant ?? "default")}
      data-tone={tone}
      data-appearance={toned ? appearance : undefined}
      className={cn(
        badgeVariants({ variant: toned ? "toned" : (variant ?? "default") }),
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          data-slot="tone-dot"
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
        />
      )}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
