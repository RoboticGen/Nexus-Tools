import { Children, cloneElement, Fragment, isValidElement, type ReactElement } from "react"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@nexus-tools/design-system/components/ui/resizable"
import { cn } from "@nexus-tools/design-system/lib/utils"

type WorkspaceColumnProps = Omit<React.ComponentProps<typeof ResizablePanel>, "children"> & {
  /** Share of the horizontal space. Omit alongside `width` for a fixed column. */
  grow?: number
  /** Fixed width in `px`. Wins over `grow`; the column ignores drags on its handle. */
  width?: string
  /** Panels, stacked top to bottom. They share the height evenly. */
  children: React.ReactNode
}

/** One resizable column inside a `WorkspaceLayout`. A thin `ResizablePanel` wrapper — `WorkspaceLayout` computes the actual `defaultSize`/`minSize`/`maxSize` from every column's `grow`/`width` at once (a single column can't know its siblings' weights), then injects them via `cloneElement`. */
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
        // Only the first column keeps its left padding; the rest butt up against their neighbour so the gutters stay even across the row.
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

/** `Children.toArray` only flattens a `Fragment` that appears *among* other children — a single top-level `<>...</>` passed as the entire `children` value comes back as one element, the fragment itself, not the columns inside it. */
function flattenChildren(children: React.ReactNode): ReactElement[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return []
    if (child.type === Fragment) {
      return flattenChildren((child.props as { children?: React.ReactNode }).children)
    }
    return [child as ReactElement]
  })
}

// Anything that is not a WorkspaceColumn is rendered outside the panel group. Cloning panel sizing onto a non-panel — a portalled dialog, say — makes react-resizable-panels count a panel that never registers, which surfaces as "Previous layout not found for panel index N".
function partitionColumns(children: React.ReactNode) {
  const columns: ReactElement<WorkspaceColumnProps>[] = []
  const extras: ReactElement[] = []

  for (const child of flattenChildren(children)) {
    if (child.type === WorkspaceColumn) {
      columns.push(child as ReactElement<WorkspaceColumnProps>)
    } else {
      extras.push(child)
    }
  }

  return { columns, extras }
}

/** Approximates a `width` column's `px` value as a percentage of the row, against a typical desktop workspace width. */
function pxToPercent(width: string): number {
  const px = Number.parseFloat(width)
  if (Number.isNaN(px)) return 25
  return Math.min(40, Math.max(10, Math.round((px / 1600) * 100)))
}

/** The page shell shared by the workspace apps: header, a row of resizable panel columns, and an optional trailing rail. */
function WorkspaceLayout({
  header,
  sidebar,
  children,
  className,
  ...props
}: WorkspaceLayoutProps) {
  const { columns, extras } = partitionColumns(children)

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
      {extras}
    </div>
  )
}

export { WorkspaceLayout, WorkspaceColumn }
export type { WorkspaceLayoutProps, WorkspaceColumnProps }
