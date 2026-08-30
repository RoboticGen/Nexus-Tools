import { Separator } from "@nexus-tools/design-system/components/ui/separator"
import { cn } from "@nexus-tools/design-system/lib/utils"

// `title` is omitted from the div props: HTML's `title` is a hover tooltip and is typed `string`, so intersecting it with ours resolves to `ReactNode & string` — a type no caller can satisfy with an element.
type ToolbarProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Names the toolbar for assistive tech. Required — see below. */
  label: string
  /** Left-hand heading, e.g. "Python code". */
  title?: React.ReactNode
  /** Right-hand slot. Buttons go here. */
  children?: React.ReactNode
  size?: "sm" | "default"
}

/** Action row above a panel or editor. */
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
      // Decorative: the grouping is visual, and Radix's Separator already sets aria-hidden when `decorative`. Announcing it would just add noise between two buttons.
      decorative
      className={cn("mx-0.5 !h-5", className)}
      {...props}
    />
  )
}

export { Toolbar, ToolbarSeparator }
