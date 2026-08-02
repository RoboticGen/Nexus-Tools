import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// `title` is omitted from the div props: HTML's `title` is a hover tooltip and
// is typed `string`, so intersecting it with ours resolves to
// `ReactNode & string` — a type no caller can satisfy with an element.
type ToolbarProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Names the toolbar for assistive tech. Required — see below. */
  label: string
  /** Left-hand heading, e.g. "Python code". */
  title?: React.ReactNode
  /** Right-hand slot. Buttons go here. */
  children?: React.ReactNode
  size?: "sm" | "default"
}

/**
 * Action row above a panel or editor.
 *
 * `SharedCodePanel` currently takes six booleans — `showEditButton`,
 * `showRunButton`, `showRunInESP32Button`, `showCopyButton`,
 * `showExportButton`, `showSaveDeviceButton` — plus six matching `on*`
 * callbacks, purely so two apps can each hide a different subset. That is a
 * slot wearing a costume: every new button costs another pair of props, and
 * the order is fixed by the component rather than the caller.
 *
 * `label` is required because `role="toolbar"` without an accessible name is a
 * container a screen reader announces as "toolbar" and nothing else; with two
 * on a page they are indistinguishable.
 */
function Toolbar({
  label,
  title,
  children,
  size = "default",
  className,
  ...props
}: ToolbarProps) {
  return (
    <div
      data-slot="toolbar"
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      className={cn(
        "border-border bg-muted/40 flex shrink-0 flex-wrap items-center gap-2 border-b px-3",
        size === "sm" ? "min-h-9 py-1" : "min-h-11 py-1.5",
        className
      )}
      {...props}
    >
      {title && (
        <span className="text-foreground mr-auto truncate text-sm font-medium">{title}</span>
      )}
      {/* ml-auto only when there is no title, so buttons still sit right. */}
      <div className={cn("flex flex-wrap items-center gap-1.5", !title && "ml-auto")}>
        {children}
      </div>
    </div>
  )
}

/** Visual divider between groups of controls in a `Toolbar`. */
function ToolbarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="toolbar-separator"
      orientation="vertical"
      // Decorative: the grouping is visual, and Radix's Separator already sets
      // aria-hidden when `decorative`. Announcing it would just add noise
      // between two buttons.
      decorative
      className={cn("mx-0.5 !h-5", className)}
      {...props}
    />
  )
}

export { Toolbar, ToolbarSeparator }
