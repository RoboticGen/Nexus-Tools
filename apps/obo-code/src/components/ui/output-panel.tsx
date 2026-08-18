import { ConnectionStatus, type ConnectionState } from "@/components/ui/connection-status"
import { Panel } from "@/components/ui/panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Terminal } from "@/components/ui/terminal"
import { Toolbar } from "@/components/ui/toolbar"

type OutputPanelTab = {
  id: string
  label: string
  /** Force-disables the tab. Device tabs are *not* disabled by default — see below. */
  disabled?: boolean
  /**
   * Requires a connected device. The tab stays reachable; its panel explains
   * what is missing and offers the connect control.
   */
  requiresDevice?: boolean
  /** Panel body. Omit for the three built-in tabs. */
  content?: React.ReactNode
}

type OutputPanelProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Tabs to show. Default: Output, REPL, Flasher. */
  tabs?: OutputPanelTab[]
  /** Active tab ID. */
  activeTab?: string
  /** Called when a tab is selected. */
  onTabChange?: (tabId: string) => void
  /** Terminal output text. */
  output?: string
  /** Terminal placeholder when output is empty. */
  outputPlaceholder?: string
  /** Terminal label for assistive tech. */
  terminalLabel?: string
  /** Output toolbar actions (e.g. Clear, Stop buttons). */
  outputActions?: React.ReactNode
  /** Connection state for device-dependent tabs. */
  connectionState?: ConnectionState
  /** Connect callback. */
  onConnect?: () => void
  /** Disconnect callback. */
  onDisconnect?: () => void
  /** Disable buttons during flash. */
  busy?: boolean
  /** Content for the REPL tab — slot. */
  replContent?: React.ReactNode
  /** Content for the Flasher tab — slot. */
  flasherContent?: React.ReactNode
}

const OUTPUT_TAB = "output"
const REPL_TAB = "repl"
const FLASHER_TAB = "flasher"

const DEFAULT_TABS: OutputPanelTab[] = [
  { id: OUTPUT_TAB, label: "Output" },
  { id: REPL_TAB, label: "REPL", requiresDevice: true },
  { id: FLASHER_TAB, label: "Flasher", requiresDevice: true },
]

const NEEDS_DEVICE: Record<string, string> = {
  [REPL_TAB]: "Connect your device first to access the REPL.",
  [FLASHER_TAB]: "Connect your device first to flash firmware.",
}

/**
 * Output panel with tabbed views: Output terminal, REPL, and Flasher.
 *
 * Replaces the Ant Design `Tabs` + `<textarea readOnly>` pattern in both
 * obo-code and obo-blocks. The Output tab uses `Terminal` (log role,
 * tail-following) rather than a text box the user cannot type into.
 *
 * Device-dependent tabs stay **enabled** while disconnected. Disabling them
 * made the panel's own "Connect your device first" prompt — with its connect
 * button — unreachable: the only route to it was through a tab that could not
 * be clicked. A disabled control that never explains itself is the worse of
 * the two failures, and it is the one the original apps shipped.
 */
function OutputPanel({
  tabs = DEFAULT_TABS,
  activeTab = OUTPUT_TAB,
  onTabChange,
  output = "",
  outputPlaceholder = "Run your code to see output here.",
  terminalLabel = "Program output",
  outputActions,
  connectionState = "disconnected",
  onConnect,
  onDisconnect,
  busy = false,
  replContent,
  flasherContent,
  ...props
}: OutputPanelProps) {
  const isConnected = connectionState === "connected"

  const builtIn = (tab: OutputPanelTab): React.ReactNode => {
    if (tab.id === REPL_TAB) {
      return (
        replContent ?? (
          <Terminal
            output=""
            placeholder="REPL session will appear here."
            label="REPL session"
            rows={10}
          />
        )
      )
    }
    if (tab.id === FLASHER_TAB) {
      return flasherContent ?? <p className="text-muted-foreground text-sm">Firmware flasher ready.</p>
    }
    return null
  }

  return (
    <Panel data-slot="output-panel" {...props}>
      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList
          variant="line"
          className="border-border shrink-0 justify-start rounded-none border-b px-2"
        >
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => {
          const blocked = tab.requiresDevice === true && !isConnected

          return (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="m-0 flex flex-1 flex-col overflow-hidden"
            >
              {blocked ? (
                <div className="flex flex-col items-start gap-3 p-4">
                  <p className="text-muted-foreground text-sm">
                    {NEEDS_DEVICE[tab.id] ?? "Connect your device first to use this tab."}
                  </p>
                  <ConnectionStatus
                    state={connectionState}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    disabled={busy}
                  />
                </div>
              ) : tab.id === OUTPUT_TAB ? (
                <>
                  {outputActions && (
                    <Toolbar label="Output actions" size="sm">
                      {outputActions}
                    </Toolbar>
                  )}
                  <div className="flex-1 overflow-hidden p-2">
                    {/* `rows` is the minimum height; `h-full` lets it take the
                        panel. Passing both is deliberate. */}
                    <Terminal
                      output={output}
                      placeholder={outputPlaceholder}
                      label={terminalLabel}
                      followTail
                      rows={10}
                      className="h-full"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-auto p-3">{tab.content ?? builtIn(tab)}</div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </Panel>
  )
}

export { OutputPanel, DEFAULT_TABS }
export type { OutputPanelProps, OutputPanelTab }
