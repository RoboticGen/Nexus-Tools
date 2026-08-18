import { Panel } from "@/components/ui/panel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TurtlePanelProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Title shown in the toolbar. */
  title?: string
  /** Names the toolbar for assistive tech. */
  toolbarLabel?: string
  /** Background options. */
  backgrounds?: Array<{ id: string; label: string }>
  /** Currently selected background. */
  activeBackground?: string
  /** Called when background changes. */
  onBackgroundChange?: (id: string) => void
  /** Extra actions, to the right of the background picker. */
  actions?: React.ReactNode
  /** The turtle canvas surface — slot. */
  children: React.ReactNode
}

const DEFAULT_BACKGROUNDS = [
  { id: "none", label: "No Background" },
  { id: "maze", label: "Maze" },
]

/**
 * Panel wrapper for turtle graphics: toolbar (with background picker) → canvas.
 *
 * Replaces `TurtleWorkspace`, which uses a raw `<select>` and custom CSS. The
 * canvas is a slot — the consumer mounts their turtle renderer inside it.
 */
function TurtlePanel({
  title = "Turtle Workspace",
  toolbarLabel = "Turtle workspace controls",
  backgrounds = DEFAULT_BACKGROUNDS,
  activeBackground = "none",
  onBackgroundChange,
  actions,
  children,
  ...props
}: TurtlePanelProps) {
  return (
    <Panel
      data-slot="turtle-panel"
      toolbarLabel={toolbarLabel}
      title={title}
      actions={
        <>
          <Select value={activeBackground} onValueChange={onBackgroundChange}>
            {/* `SelectValue`'s placeholder only renders while the select is
                empty, and this one always has a value — so without an explicit
                label the trigger is a combobox with no accessible name. */}
            <SelectTrigger size="sm" aria-label="Canvas background" className="w-36">
              <SelectValue placeholder="Background" />
            </SelectTrigger>
            <SelectContent>
              {backgrounds.map((background) => (
                <SelectItem key={background.id} value={background.id}>
                  {background.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actions}
        </>
      }
      {...props}
    >
      {children}
    </Panel>
  )
}

export { TurtlePanel, DEFAULT_BACKGROUNDS }
export type { TurtlePanelProps }
