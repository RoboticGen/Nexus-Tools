import { Toolbar } from "@/components/ui/toolbar"
import { cn } from "@/lib/utils"

// `title` is omitted from the div props: HTML's `title` is a hover tooltip,
// ours is the toolbar heading, and an intersection of the two resolves to
// `ReactNode & string` — a type nothing satisfies.
type PanelProps = Omit<React.ComponentProps<"div">, "title"> & {
  /**
   * Names the toolbar for assistive tech. **The toolbar only renders when this
   * is set** — `role="toolbar"` with no accessible name announces as "toolbar"
   * and nothing else, and these apps put three of them on one screen, so an
   * unnamed one is not worth rendering.
   */
  toolbarLabel?: string
  /** Left-hand heading in the toolbar. Needs `toolbarLabel`. */
  title?: React.ReactNode
  /** Right-hand toolbar slot. Needs `toolbarLabel`. */
  actions?: React.ReactNode
  children: React.ReactNode
}

/**
 * The bordered workspace surface shared by every editor-shaped panel:
 * `CodeEditorPanel`, `BlocklyPanel`, `TurtlePanel`, `OutputPanel`.
 *
 * All four opened life as the same eleven Tailwind classes copied four times,
 * which is how the surface drifts — one panel gets a shadow, another keeps a
 * square corner, and the four stop looking like one product. The panel body is
 * `overflow-hidden` because every consumer mounts something that scrolls
 * itself (Monaco, a Blockly workspace, a canvas, a log).
 */
function Panel({
  title,
  toolbarLabel,
  actions,
  children,
  className,
  ...props
}: PanelProps) {
  return (
    <div
      data-slot="panel"
      className={cn(
        "border-border bg-card flex flex-col overflow-hidden rounded-lg border",
        className
      )}
      {...props}
    >
      {toolbarLabel && (
        <Toolbar label={toolbarLabel} title={title} size="sm">
          {actions}
        </Toolbar>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

export { Panel }
export type { PanelProps }
