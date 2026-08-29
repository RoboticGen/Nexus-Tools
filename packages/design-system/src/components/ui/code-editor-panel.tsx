import { Plus, X } from "lucide-react"
import { useState } from "react"

import { Badge } from "@nexus-tools/design-system/components/ui/badge"
import { Button } from "@nexus-tools/design-system/components/ui/button"
import { Panel } from "@nexus-tools/design-system/components/ui/panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nexus-tools/design-system/components/ui/tabs"
import { cn } from "@nexus-tools/design-system/lib/utils"

type CodeEditorTab = {
  id: string
  label: string
  /** Set `false` to pin a tab — no close button, regardless of tab count. */
  closable?: boolean
}

type CodeEditorPanelProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Title shown in the toolbar. */
  title?: string
  /** Names the toolbar for assistive tech. */
  toolbarLabel?: string
  /** Action buttons — passed to the toolbar's right-hand slot. */
  actions?: React.ReactNode
  /** File tabs. Omit for single-buffer mode. */
  tabs?: CodeEditorTab[]
  /** Active tab ID. Ignored when `tabs` is omitted. */
  activeTab?: string
  /** Called when a tab is selected. */
  onTabChange?: (tabId: string) => void
  /** Called when a tab's close button is pressed. Omit to hide close buttons entirely. */
  onTabClose?: (tabId: string) => void
  /** Called with the trimmed new label once a rename commits. Omit to disable renaming. */
  onTabRename?: (tabId: string, label: string) => void
  /** Renders a trailing "+" button that calls this. Omit to hide it. */
  onTabAdd?: () => void
  /** Extra content to the right of tabs. */
  tabActions?: React.ReactNode
  /** Marks the buffer as not editable — obo-blocks' generated-Python view. Adds a badge to the toolbar and `aria-readonly` to the panel; the editor in the slot still has to enforce it. */
  readOnly?: boolean
  /** The editor surface itself — slot, not a built-in. */
  children: React.ReactNode
}

/** Panel wrapper for a code editor: toolbar → file tabs → editor slot. The editor is a `children` slot rather than a built-in Monaco mount, because the design system does not depend on `@monaco-editor/react` — the consumer brings their own editor and drops it in. The only job here is the *chrome*: a named toolbar, real file tabs, and the tokens. Tabs can close, rename and add. */
function CodeEditorPanel({
  title = "Python Code",
  toolbarLabel = "Editor actions",
  actions,
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  onTabRename,
  onTabAdd,
  tabActions,
  readOnly = false,
  children,
  ...props
}: CodeEditorPanelProps) {
  const hasTabs = tabs !== undefined && tabs.length > 0

  // Rename's draft text is local UI state for the same reason Terminal's scroll-pin and DeviceSidebar's expand state are: no consumer wants to own a half-typed value between keystrokes.
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  const startRename = (tab: CodeEditorTab) => {
    setEditingTabId(tab.id)
    setDraft(tab.label)
  }

  const commitRename = () => {
    const trimmed = draft.trim()
    if (editingTabId && trimmed) onTabRename?.(editingTabId, trimmed)
    setEditingTabId(null)
  }

  const cancelRename = () => setEditingTabId(null)

  return (
    <Panel
      data-slot="code-editor-panel"
      // Not `aria-readonly`: that is only allowed on widget roles, and this is a plain container. The badge in the toolbar carries the meaning; the editor in the slot is what actually enforces it.
      data-readonly={readOnly || undefined}
      toolbarLabel={toolbarLabel}
      title={
        readOnly ? (
          <span className="flex items-center gap-2">
            {title}
            {/* The obo-blocks story spelled this as an absolutely-positioned
                `bg-[#333] text-[#888]` chip floating over the editor: 3.56:1,
                a real AA failure, and invisible in light mode. */}
            <Badge tone="neutral" appearance="soft">
              Read only
            </Badge>
          </span>
        ) : (
          title
        )
      }
      actions={actions}
      {...props}
    >
      {hasTabs ? (
        <Tabs
          value={activeTab ?? tabs[0].id}
          onValueChange={onTabChange}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="border-border bg-muted/40 flex shrink-0 items-center border-b px-1">
            {/*
              `TabsList` is `role="tablist"`, which axe's aria-required-children
              rule only allows `role="tab"` descendants under — a close
              `<button>` anywhere inside it, wrapper `<div>` or not, fails that
              rule, since a plain `<div>` has no role and doesn't break the
              parent-child relationship. `display: contents` keeps `TabsList`
              a real tablist for Radix and axe alike while removing its own
              box, so its only DOM children are `TabsTrigger`s; the close
              buttons and rename input render as its *siblings* instead and
              are repositioned onto the same row with inline `order`, which —
              unlike DOM order — CSS is free to override per flex item.
            */}
            <div className="flex h-8 flex-1 items-center gap-1 overflow-x-auto">
              <TabsList variant="line" className="contents">
                {tabs.map((tab, index) => {
                  if (editingTabId === tab.id) return null
                  const canClose = tab.closable !== false && onTabClose && tabs.length > 1

                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      style={{ order: index * 2 }}
                      className={cn(
                        "px-3 text-xs",
                        canClose && "pr-6",
                        // A hairline between adjacent tabs — `variant="line"`'s 4px
                        // gap alone doesn't read as a boundary between two files.
                        // Keyed off `index`, not a DOM pseudo-class: visual order
                        // here comes from the `order` style, not DOM order, so
                        // `:first-child`/`:last-child` would pick the wrong tab.
                        index > 0 && "border-l border-border"
                      )}
                      onDoubleClick={() => onTabRename && startRename(tab)}
                      onKeyDown={(event) => {
                        if (event.key === "F2" && onTabRename) {
                          event.preventDefault()
                          startRename(tab)
                        } else if ((event.key === "Delete" || event.key === "Backspace") && canClose) {
                          event.preventDefault()
                          onTabClose?.(tab.id)
                        }
                      }}
                    >
                      {tab.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {tabs.map((tab, index) => {
                if (editingTabId === tab.id) {
                  return (
                    <input
                      key={tab.id}
                      // Not the `autoFocus` attribute: its native `.focus()` call has
                      // `preventScroll: false`, so the browser scrolls every scrollable
                      // ancestor (this row, the panel, the workspace) to reveal it —
                      // in a nested layout that reads as the whole view jumping to a
                      // corner. Focusing manually with `preventScroll: true` keeps the
                      // input's position the only thing that changes.
                      ref={(el) => el?.focus({ preventScroll: true })}
                      value={draft}
                      aria-label={`Rename ${tab.label}`}
                      style={{ order: index * 2 }}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          commitRename()
                        } else if (event.key === "Escape") {
                          event.preventDefault()
                          cancelRename()
                        }
                      }}
                      onBlur={commitRename}
                      className="border-ring bg-background focus-ring h-6 w-20 shrink-0 rounded border px-1.5 text-xs"
                    />
                  )
                }

                const canClose = tab.closable !== false && onTabClose && tabs.length > 1
                if (!canClose) return null

                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-label={`Close ${tab.label}`}
                    style={{ order: index * 2 + 1 }}
                    onClick={() => onTabClose?.(tab.id)}
                    className="hover:bg-muted focus-ring inline-flex size-5 shrink-0 items-center justify-center rounded-sm"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            {onTabAdd && (
              <Button variant="ghost" size="icon-xs" className="mx-1" aria-label="New file" onClick={onTabAdd}>
                <Plus aria-hidden="true" />
              </Button>
            )}
            {tabActions}
          </div>

          {/*
            The editor lives inside `TabsContent`, one per tab. Radix mounts
            only the active one, so `children` still renders exactly once — but
            the panel now *exists*, which is the whole point: a `TabsList` with
            no `TabsContent` leaves every trigger's `aria-controls` pointing at
            an element that was never rendered. Tabs that control nothing are an
            axe failure and, worse, a screen reader dead end.
          */}
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="m-0 flex flex-1 flex-col overflow-hidden"
            >
              {children}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        children
      )}
    </Panel>
  )
}

export { CodeEditorPanel }
export type { CodeEditorPanelProps, CodeEditorTab }
