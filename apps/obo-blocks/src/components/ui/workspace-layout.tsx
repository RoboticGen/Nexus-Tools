import { Children, cloneElement, Fragment, isValidElement, type ReactElement } from "react"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { cn } from "@/lib/utils"

type WorkspaceColumnProps = Omit<React.ComponentProps<typeof ResizablePanel>, "children"> & {
  /**
   * Share of the horizontal space. Omit alongside `width` for a fixed column.
   * Weights are relative: `3` and `2` split 60/40 of whatever is left after
   * `width` columns take their share.
   */
  grow?: number
  /** Fixed width in `px`. Wins over `grow`; the column ignores drags on its handle. */
  width?: string
  /** Panels, stacked top to bottom. They share the height evenly. */
  children: React.ReactNode
}

/**
 * One resizable column inside a `WorkspaceLayout`.
 *
 * A thin `ResizablePanel` wrapper — `WorkspaceLayout` computes the actual
 * `defaultSize`/`minSize`/`maxSize` from every column's `grow`/`width` at
 * once (a single column can't know its siblings' weights), then injects them
 * via `cloneElement`. Rendering this directly outside a `WorkspaceLayout`
 * leaves it unsized.
 *
 * Direct children stretch to fill, so a column of one panel is just that panel.
 * To weight a stack — an editor over a shorter console — set `style={{ flex: 3 }}`
 * and `style={{ flex: 2 }}` on the panels; that split is vertical and unrelated
 * to this column's own horizontal sizing.
 */
function WorkspaceColumn({
  grow: _grow,
  width: _width,
  children,
  className,
  ...props
}: WorkspaceColumnProps) {
  return (
    <ResizablePanel
      data-slot="workspace-column"
      className={cn(
        "flex min-w-0 flex-col gap-2 overflow-hidden p-2",
        // Only the first column keeps its left padding; the rest butt up
        // against their neighbour so the gutters stay even across the row.
        "[&:not(:first-child)]:pl-0",
        "[&>*]:min-h-0 [&>*]:flex-1",
        className
      )}
      {...props}
    >
      {children}
    </ResizablePanel>
  )
}

type WorkspaceLayoutProps = React.ComponentProps<"div"> & {
  /** The app header. Rendered above everything, full width. */
  header?: React.ReactNode
  /** Full-height rail pinned to the trailing edge — normally a `DeviceSidebar`. */
  sidebar?: React.ReactNode
  /** One or more `WorkspaceColumn`s. */
  children: React.ReactNode
}

/**
 * `Children.toArray` only flattens a `Fragment` that appears *among* other
 * children — a single top-level `<>...</>` passed as the entire `children`
 * value (exactly what a `render: () => <><Column /><Column /></>` story
 * args object does) comes back as one element, the fragment itself, not the
 * columns inside it. `WorkspaceColumn`s then never get a computed size or a
 * handle between them and silently fall back to `react-resizable-panels`'
 * own even split.
 */
function flattenColumns(children: React.ReactNode): ReactElement<WorkspaceColumnProps>[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return []
    if (child.type === Fragment) {
      return flattenColumns((child.props as { children?: React.ReactNode }).children)
    }
    return [child as ReactElement<WorkspaceColumnProps>]
  })
}

/**
 * Approximates a `width` column's `px` value as a percentage of the row,
 * against a typical desktop workspace width. `react-resizable-panels` has no
 * `px` unit — every panel size is a percentage of its group — so a column
 * that used to be exactly `340px` becomes *about* that wide instead, clamped
 * to a sane range so a stray value can't collapse or swallow the row.
 */
function pxToPercent(width: string): number {
  const px = Number.parseFloat(width)
  if (Number.isNaN(px)) return 25
  return Math.min(40, Math.max(10, Math.round((px / 1600) * 100)))
}

/**
 * The page shell shared by the workspace apps: header, a row of resizable
 * panel columns, and an optional trailing rail.
 *
 * obo-code and obo-blocks each hand-rolled the column row as a `flex flex-1`
 * of `flex-[3]`/`flex-[2]` divs — a CSS ratio has nothing a pointer event
 * could change, so neither app has a single user-resizable pane today. The
 * row is a `ResizablePanelGroup` now; `WorkspaceColumn`'s `grow`/`width` API
 * is unchanged; the underlying split is a percentage a user can drag instead
 * of a ratio baked into the stylesheet.
 *
 * Neither original app wrapped its content in a `<main>`, so every workspace
 * panel sat outside a landmark and was unreachable by landmark navigation.
 *
 * `h-dvh` rather than `h-screen`: on mobile browsers `100vh` includes the
 * retracted URL bar, so the sidebar's bottom is cut off until the user scrolls.
 */
function WorkspaceLayout({
  header,
  sidebar,
  children,
  className,
  ...props
}: WorkspaceLayoutProps) {
  const columns = flattenColumns(children)

  const pinnedTotal = columns.reduce(
    (sum, column) => sum + (column.props.width ? pxToPercent(column.props.width) : 0),
    0
  )
  const growTotal = columns.reduce(
    (sum, column) => sum + (column.props.width ? 0 : (column.props.grow ?? 1)),
    0
  )
  const remaining = Math.max(100 - pinnedTotal, 0)

  return (
    <div
      data-slot="workspace-layout"
      className={cn(
        "bg-background text-foreground flex h-dvh flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {header}
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {columns.map((column, index) => {
              const { width, grow = 1 } = column.props
              const size = width ? pxToPercent(width) : (remaining * grow) / (growTotal || 1)

              return (
                <Fragment key={column.key}>
                  {index > 0 && <ResizableHandle withHandle />}
                  {cloneElement(column, {
                    defaultSize: size,
                    minSize: width ? size : 10,
                    maxSize: width ? size : undefined,
                  })}
                </Fragment>
              )
            })}
          </ResizablePanelGroup>
        </main>
        {sidebar}
      </div>
    </div>
  )
}

export { WorkspaceLayout, WorkspaceColumn }
export type { WorkspaceLayoutProps, WorkspaceColumnProps }
