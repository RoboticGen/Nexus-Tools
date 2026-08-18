import { GripVertical } from "lucide-react"
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
  type PanelGroupProps,
  type PanelProps,
  type PanelResizeHandleProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

/**
 * Draggable split panes.
 *
 * `react-resizable-panels`, not a hand-rolled drag listener: `WorkspaceLayout`
 * used to split columns with fixed `flex` weights (`3 1 0%`, `2 1 0%`), which
 * is why obo-code and obo-blocks have no user-resizable panes today — a CSS
 * ratio has nothing a pointer event could change. The library also ships
 * keyboard resizing on the handle for free; a drag-only splitter would be a
 * keyboard trap on a page that is otherwise fully operable without a mouse.
 *
 * The library exports its own `Panel`, which collides with this design
 * system's `Panel` (the bordered toolbar+body surface every editor panel
 * sits inside — see `panel.tsx`). Renamed on import so both can be used
 * together, which is the normal case: a `ResizablePanel` wraps a `Panel`.
 */
function ResizablePanelGroup({ className, ...props }: PanelGroupProps) {
  return (
    <PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: PanelProps) {
  return <Panel data-slot="resizable-panel" {...props} />
}

type ResizableHandleProps = PanelResizeHandleProps & {
  /** Shows the grip glyph. Off by default — most splitters are a bare line. */
  withHandle?: boolean
}

/**
 * The draggable divider between two `ResizablePanel`s.
 *
 * `role="separator"` and `aria-valuenow` come from the library itself; this
 * only supplies the visual line and the focus ring. The hit target is wider
 * than the visible line (`after:w-4` on a `w-px` line) so the drag start
 * doesn't require pixel-precise pointer placement.
 */
function ResizableHandle({ withHandle, className, ...props }: ResizableHandleProps) {
  return (
    <PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border relative flex w-px items-center justify-center",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2",
        "focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
        "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-4",
        "data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVertical className="size-2.5" aria-hidden="true" />
        </div>
      )}
    </PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
export type { ImperativePanelHandle }
