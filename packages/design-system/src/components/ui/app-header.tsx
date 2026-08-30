import { cn } from "@nexus-tools/design-system/lib/utils"

type AppHeaderProps = React.ComponentProps<"header"> & {
  /** Product mark, top-left. Wrap it in a link yourself if it should navigate. */
  brand?: React.ReactNode
  /** Primary navigation, beside the brand. Rendered inside a `<nav>`. */
  nav?: React.ReactNode
  /** Right-hand slot — user menu, logout, secondary marks. */
  actions?: React.ReactNode
  /** Second row: breadcrumbs, tabs, a toolbar. Scrolls away with the header. */
  children?: React.ReactNode
  /** Sticks to the top of the viewport at `z-sticky`. */
  sticky?: boolean
  /** Drops the bottom border, for a header sitting directly on a toolbar. */
  borderless?: boolean
}

/** Application top bar. obo-code and obo-blocks each carry their own `navbar.tsx`. */
function AppHeader({
  brand,
  nav,
  actions,
  children,
  sticky = true,
  borderless = false,
  className,
  ...props
}: AppHeaderProps) {
  return (
    <header
      data-slot="app-header"
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/80 w-full backdrop-blur",
        !borderless && "border-border border-b",
        // z-sticky (100) from the ladder, not a literal: this has to sit under every overlay but above page content.
        sticky && "sticky top-0 z-sticky",
        className
      )}
      {...props}
    >
      <div className="flex h-14 items-center gap-4 px-4">
        {brand && <div className="flex shrink-0 items-center gap-2">{brand}</div>}

        {nav && (
          <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-1">
            {nav}
          </nav>
        )}

        {/* Keeps `actions` hard right whether or not `nav` claimed the middle. */}
        {actions && (
          <div className={cn("flex shrink-0 items-center gap-2", !nav && "ml-auto")}>
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="border-border flex min-h-11 items-center gap-2 border-t px-4">
          {children}
        </div>
      )}
    </header>
  )
}

export { AppHeader }
