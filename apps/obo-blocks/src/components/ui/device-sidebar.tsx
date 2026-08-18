import {
  Download,
  FileText,
  FolderOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ConnectionStatus, type ConnectionState } from "@/components/ui/connection-status"
import { cn } from "@/lib/utils"

type DeviceFile = {
  name: string
  size?: number
  active?: boolean
}

type DeviceSidebarProps = React.ComponentProps<"aside"> & {
  /** Expanded state. Omit to let the sidebar own it. */
  expanded?: boolean
  /** Called when expand/collapse toggles. */
  onExpandChange?: (expanded: boolean) => void
  /** Connection state. */
  connectionState?: ConnectionState
  /** Connect callback. */
  onConnect?: () => void
  /** Disconnect callback. */
  onDisconnect?: () => void
  /** Files on the device. */
  files?: DeviceFile[]
  /** Called when a file is selected — opens it into the editor. */
  onFileSelect?: (filename: string) => void
  /** Renders a per-file download button. Omit to hide it. */
  onFileDownload?: (filename: string) => void
  /** Renders a per-file delete button, gated behind a confirm dialog. Omit to hide it. */
  onFileDelete?: (filename: string) => void
  /** Renders a "Refresh" button that re-lists the device's files. Omit to hide it. */
  onRefresh?: () => void
  /** Blocks interactions during flash. */
  busy?: boolean
}

/** Bytes, in the smallest unit that keeps the number under four digits. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Collapsible sidebar for device file management.
 *
 * Replaces `DeviceFileManagerSidebar` and the 11 KB of hand-written sidebar CSS
 * in obo-code, plus its copy in obo-blocks.
 *
 * The file list is a plain list of buttons, not a `listbox`. A `listbox` is a
 * single-tab-stop widget driven by arrow keys and `aria-activedescendant`;
 * spelling one with `role="option"` on individually tabbable `<button>`s inside
 * `<li>`s produces a control that announces as a listbox and behaves as
 * nothing of the sort — and fails `aria-required-children`,
 * `aria-required-parent` and `listitem` at once. Selection is carried by
 * `aria-current`, which is what "this is the open file" actually means.
 *
 * Download and delete render as siblings of the select button inside the
 * `<li>`, not nested inside it. The original wraps the whole row in a
 * `role="button"` `<li>` and nests real `<button>`s for its actions inside
 * that, relying on `stopPropagation` alone to keep a click on Delete from
 * also opening the file — a clickable element inside a clickable element,
 * not fixed just because the outer one is a `role`, not a real `<button>`.
 * Delete goes through `ConfirmDialog`, matching the antd `Modal.confirm` it
 * replaces.
 */
function DeviceSidebar({
  expanded: controlledExpanded,
  onExpandChange,
  connectionState = "disconnected",
  onConnect,
  onDisconnect,
  files = [],
  onFileSelect,
  onFileDownload,
  onFileDelete,
  onRefresh,
  busy = false,
  className,
  ...props
}: DeviceSidebarProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [internalExpanded, setInternalExpanded] = useState(true)
  const isControlled = controlledExpanded !== undefined
  const expanded = controlledExpanded ?? internalExpanded

  const toggleExpanded = () => {
    const next = !expanded
    // Writing internal state while controlled makes the two diverge the moment
    // the consumer declines a toggle.
    if (!isControlled) setInternalExpanded(next)
    onExpandChange?.(next)
  }

  const isConnected = connectionState === "connected"

  return (
    <aside
      data-slot="device-sidebar"
      data-expanded={expanded}
      className={cn(
        "border-border bg-card shadow-e2 flex flex-col border-l",
        // Only the width animates. `transition-all` also animates colour, so
        // the whole sidebar cross-fades on every theme toggle.
        "transition-[width] duration-(--duration-normal) ease-standard",
        expanded ? "w-64" : "w-12",
        className
      )}
      {...props}
    >
      <div className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse file manager" : "Expand file manager"}
        >
          {/* The panel collapses sideways, so the chevron pair pointed the
              wrong axis entirely. */}
          {expanded ? (
            <PanelRightClose aria-hidden="true" />
          ) : (
            <PanelRightOpen aria-hidden="true" />
          )}
        </Button>
        {expanded && (
          <span className="text-foreground truncate text-sm font-medium">Device Files</span>
        )}
      </div>

      {expanded && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-border border-b p-3">
            <ConnectionStatus
              state={connectionState}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              disabled={busy}
            />
          </div>

          {isConnected && (
            <div className="flex-1 overflow-auto p-2">
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-muted-foreground text-[0.625rem] font-medium tracking-wide uppercase">
                  Files
                </span>
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onRefresh}
                    disabled={busy}
                    aria-label="Refresh device files"
                  >
                    <RefreshCw aria-hidden="true" />
                  </Button>
                )}
              </div>

              {files.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FolderOpen className="text-muted-foreground size-8" aria-hidden="true" />
                  <p className="text-muted-foreground text-xs">No files on device</p>
                </div>
              ) : (
                <ul aria-label="Device files" className="space-y-0.5">
                  {files.map((file) => (
                    <li key={file.name} className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-current={file.active ? "true" : undefined}
                        disabled={busy}
                        onClick={() => onFileSelect?.(file.name)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                          "disabled:pointer-events-none disabled:opacity-50",
                          file.active && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <FileText
                          className="text-muted-foreground size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{file.name}</span>
                        {file.size !== undefined && (
                          <span className="text-muted-foreground shrink-0 text-[0.625rem] tabular-nums">
                            {formatSize(file.size)}
                          </span>
                        )}
                      </button>
                      {onFileDownload && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={busy}
                          onClick={() => onFileDownload(file.name)}
                          aria-label={`Download ${file.name}`}
                        >
                          <Download aria-hidden="true" />
                        </Button>
                      )}
                      {onFileDelete && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={busy}
                          onClick={() => setDeleting(file.name)}
                          aria-label={`Delete ${file.name}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Delete ${deleting}?` : "Delete file?"}
        description="This removes the file from the device's flash memory. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (deleting) onFileDelete?.(deleting)
          setDeleting(null)
        }}
      />
    </aside>
  )
}

export { DeviceSidebar }
export type { DeviceSidebarProps, DeviceFile }
