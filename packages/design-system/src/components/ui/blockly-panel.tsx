import { Panel } from "@nexus-tools/design-system/components/ui/panel"

type BlocklyPanelProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Title shown in the toolbar. */
  title?: string
  /** Names the toolbar for assistive tech. */
  toolbarLabel?: string
  /** Action buttons — Import, Export. */
  actions?: React.ReactNode
  /** The Blockly workspace surface — slot. */
  children: React.ReactNode
}

/** Panel wrapper for the Blockly visual editor: toolbar → workspace slot. The workspace is a slot: the design system does not depend on Blockly. */
function BlocklyPanel({
  title = "Visual Blocks",
  toolbarLabel = "Block editor actions",
  actions,
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
      {children}
    </Panel>
  )
}

export { BlocklyPanel }
export type { BlocklyPanelProps }
