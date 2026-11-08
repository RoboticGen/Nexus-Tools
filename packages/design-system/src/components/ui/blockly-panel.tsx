"use client"

import { ChevronLeft, Puzzle } from "lucide-react"
import * as React from "react"

import { Button } from "@nexus-tools/design-system/components/ui/button"
import { Panel } from "@nexus-tools/design-system/components/ui/panel"

/** The slice of a Blockly `WorkspaceSvg` the toolbox toggle uses, so this package stays Blockly-free. */
type ToolboxWorkspace = {
  getInjectionDiv(): Element
  getToolbox(): { setVisible(visible: boolean): void; clearSelection(): void } | null
  resize(): void
}

type BlocklyPanelProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Title shown in the toolbar. */
  title?: string
  /** Names the toolbar for assistive tech. */
  toolbarLabel?: string
  /** Action buttons — Import, Export. */
  actions?: React.ReactNode
  /** The injected workspace; when set, its category list can be hidden and shown. */
  workspace?: ToolboxWorkspace | null
  /** The Blockly workspace surface — slot. */
  children: React.ReactNode
}

function ToolboxToggle({ workspace }: { workspace: ToolboxWorkspace }) {
  const [open, setOpen] = React.useState(true)
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    setOpen(true)
    const toolbox = workspace.getInjectionDiv().querySelector<HTMLElement>(".blocklyToolbox")
    if (!toolbox) return
    toolbox.style.paddingTop = "2.5rem" // room for the header row
    // Watched, not read once: the toolbox widens after inject as fonts and categories lay out.
    // Hidden, it measures 0; keep the last width for showing it again.
    const observer = new ResizeObserver(() => {
      if (toolbox.offsetWidth > 0) setWidth(toolbox.offsetWidth)
    })
    observer.observe(toolbox)
    return () => observer.disconnect()
  }, [workspace])

  const show = (next: boolean) => {
    const toolbox = workspace.getToolbox()
    if (!toolbox) return
    toolbox.clearSelection()
    toolbox.setVisible(next)
    workspace.resize()
    setOpen(next)
  }

  if (width === 0) return null
  return open ? (
    <div
      className="absolute top-1.5 left-0 z-[80] flex items-center justify-between pr-1 pl-3"
      style={{ width }}
    >
      <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">Blocks</span>
      <Button size="icon-sm" variant="ghost" aria-label="Hide block list" title="Hide block list" onClick={() => show(false)}>
        <ChevronLeft aria-hidden="true" className="text-brand-teal" />
      </Button>
    </div>
  ) : (
    <Button
      size="sm"
      variant="outline"
      className="bg-card absolute top-2 left-2 z-[80] shadow-sm"
      title="Show block list"
      onClick={() => show(true)}
    >
      <Puzzle aria-hidden="true" className="text-brand-teal" />
      Blocks
    </Button>
  )
}

/** Panel wrapper for the Blockly visual editor: toolbar → workspace slot. The workspace is a slot: the design system does not depend on Blockly. */
function BlocklyPanel({
  title = "Visual Blocks",
  toolbarLabel = "Block editor actions",
  actions,
  workspace,
  children,
  ...props
}: BlocklyPanelProps) {
  return (
    <Panel
      data-slot="blockly-panel"
      toolbarLabel={toolbarLabel}
      title={title}
      actions={actions}
      {...props}
    >
      <div className="relative h-full min-h-0 w-full">
        {children}
        {workspace && <ToolboxToggle workspace={workspace} />}
      </div>
    </Panel>
  )
}

export { BlocklyPanel }
export type { BlocklyPanelProps }
