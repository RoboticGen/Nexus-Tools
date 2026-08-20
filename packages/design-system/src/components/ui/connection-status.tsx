import { Loader2, Plug, PlugZap, Unplug } from "lucide-react"

import { Button } from "@nexus-tools/design-system/components/ui/button"
import { cn } from "@nexus-tools/design-system/lib/utils"

import type { Tone } from "@nexus-tools/design-system/lib/tone"

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "unsupported"
  | "error"

const STATES: Record<
  ConnectionState,
  { tone: Tone; label: string; icon: typeof Plug; busy?: boolean }
> = {
  disconnected: { tone: "neutral", label: "Not connected", icon: Plug },
  connecting: { tone: "info", label: "Connecting…", icon: Loader2, busy: true },
  connected: { tone: "success", label: "Connected", icon: PlugZap },
  unsupported: { tone: "warning", label: "Not supported in this browser", icon: Unplug },
  error: { tone: "danger", label: "Connection failed", icon: Unplug },
}

type ConnectionStatusProps = Omit<React.ComponentProps<"div">, "onError"> & {
  state: ConnectionState
  /** Overrides the default wording — e.g. the device name once connected. */
  label?: React.ReactNode
  onConnect?: () => void
  onDisconnect?: () => void
  /** Blocks both buttons, e.g. mid-flash. */
  disabled?: boolean
  /** Indicator only, no buttons. */
  readOnly?: boolean
}

/** Device connection indicator and its connect/disconnect control. Both Nexus-Tools output panels rebuild this: an `isConnected` ternary choosing between a primary "Connect Device" and a danger "Disconnect", with the state itself communicated only by which button is showing. */
function ConnectionStatus({
  state,
  label,
  onConnect,
  onDisconnect,
  disabled = false,
  readOnly = false,
  className,
  ...props
}: ConnectionStatusProps) {
  const config = STATES[state]
  const Icon = config.icon
  const connectable = state === "disconnected" || state === "error"

  return (
    <div
      data-slot="connection-status"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    >
      <span
        data-tone={config.tone}
        data-appearance="soft"
        // A live region: the connection can drop without the user doing anything, and that is worth announcing. Polite, not assertive — it should not interrupt.
        role="status"
        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
      >
        <Icon aria-hidden="true" className={cn("size-3.5", config.busy && "animate-spin")} />
        {label ?? config.label}
      </span>

      {!readOnly && (
        <>
          {connectable && onConnect && (
            <Button
              size="sm"
              variant="outline"
              onClick={onConnect}
              // `unsupported` deliberately renders no button at all rather than a disabled one: there is nothing the user can do to make it work, and a greyed button invites them to keep trying.
              disabled={disabled}
            >
              <Plug aria-hidden="true" />
              Connect device
            </Button>
          )}
          {state === "connected" && onDisconnect && (
            <Button size="sm" variant="outline" onClick={onDisconnect} disabled={disabled}>
              <Unplug aria-hidden="true" />
              Disconnect
            </Button>
          )}
        </>
      )}
    </div>
  )
}

export { ConnectionStatus, STATES as CONNECTION_STATES }
