import { CornerDownLeft, RotateCcw, Square, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Terminal } from "@/components/ui/terminal"
import { Toolbar } from "@/components/ui/toolbar"
import { cn } from "@/lib/utils"

type ReplConsoleProps = Omit<React.ComponentProps<"div">, "children" | "title"> & {
  /** REPL scrollback. Newlines preserved — same contract as `Terminal.output`. */
  output?: string
  /** Shown in place of the scrollback while it is empty. */
  placeholder?: string
  /** Names the scrollback region for assistive tech. */
  label?: string
  /** Swaps the prompt glyph to the continuation form, e.g. inside a `def`. */
  continuation?: boolean
  /** Called with the typed line on Enter or Send. The input clears itself. */
  onSend?: (command: string) => void
  /** Ctrl-C — interrupts the running program. */
  onInterrupt?: () => void
  /** Ctrl-D — soft-resets the board. */
  onSoftReset?: () => void
  /** Clears the scrollback. */
  onClear?: () => void
  /** Disables the command line and every toolbar button, e.g. while disconnected. */
  disabled?: boolean
}

/**
 * Interactive MicroPython REPL: scrollback, a command line, and the
 * interrupt/reset/clear controls a REPL needs.
 *
 * Replaces `ESP32REPL.tsx`, whose scrollback is a `<div>` of manually
 * `.map()`-ed lines with no role, and whose input has no accessible name
 * beyond a visual `>>>` glyph — a screen reader announces it as an unlabelled
 * textbox. Scrollback here is a `Terminal`, so tail-following and the `log`
 * role come for free; the `>>>`/`...` prompt is `aria-hidden` decoration, and
 * the actual name comes from the input's own `aria-label`.
 *
 * The 200-line cap the original hardcodes (`MAX_LINES`) is not this
 * component's job — `output` is a plain string, same as `Terminal`, and
 * trimming it is the caller's concern, same as `Terminal`'s.
 *
 * Command history (↑/↓) is local UI state, not lifted — no consumer of a REPL
 * widget wants to own "what did the user type three commands ago."
 */
function ReplConsole({
  output = "",
  placeholder = "REPL session will appear here.",
  label = "REPL session",
  continuation = false,
  onSend,
  onInterrupt,
  onSoftReset,
  onClear,
  disabled = false,
  className,
  ...props
}: ReplConsoleProps) {
  const [value, setValue] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)

  const send = () => {
    const command = value.trim()
    if (!command) return

    onSend?.(command)
    setHistory((current) => [...current, command])
    setHistoryIndex(null)
    setValue("")
  }

  const recall = (direction: -1 | 1) => {
    if (history.length === 0) return

    const next =
      historyIndex === null
        ? history.length - 1
        : Math.min(Math.max(historyIndex + direction, 0), history.length - 1)

    // Walking past the oldest entry with ↑ stays put; past the newest with ↓
    // clears the line, matching a shell history buffer.
    if (direction === 1 && historyIndex === history.length - 1) {
      setHistoryIndex(null)
      setValue("")
      return
    }

    setHistoryIndex(next)
    setValue(history[next])
  }

  return (
    <div data-slot="repl-console" className={cn("flex flex-1 flex-col overflow-hidden", className)} {...props}>
      <Toolbar label="REPL controls" size="sm">
        <Button size="sm" variant="outline" onClick={onClear} disabled={disabled}>
          <Trash2 aria-hidden="true" />
          Clear
        </Button>
        <Button size="sm" variant="outline" onClick={onInterrupt} disabled={disabled}>
          <Square aria-hidden="true" />
          Interrupt
        </Button>
        <Button size="sm" variant="outline" onClick={onSoftReset} disabled={disabled}>
          <RotateCcw aria-hidden="true" />
          Soft reset
        </Button>
      </Toolbar>

      <div className="flex-1 overflow-hidden p-2">
        <Terminal
          output={output}
          placeholder={placeholder}
          label={label}
          followTail
          rows={10}
          className="h-full"
        />
      </div>

      <form
        className="border-border flex items-center gap-2 border-t px-2 py-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        {/* Decorative: the input's own aria-label is the accessible name.
            A sighted-only glyph, same reasoning as the terminal prompt in a
            real serial console. */}
        <span aria-hidden="true" className="text-muted-foreground shrink-0 font-mono text-xs">
          {continuation ? "..." : ">>>"}
        </span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          aria-label="REPL command"
          placeholder="Type a command and press Enter"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault()
              recall(-1)
            } else if (event.key === "ArrowDown") {
              event.preventDefault()
              recall(1)
            }
          }}
          className={cn(
            "h-7 flex-1 rounded-md border border-transparent bg-transparent px-1.5 font-mono text-xs",
            "outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
        <Button type="submit" size="icon-sm" variant="ghost" disabled={disabled} aria-label="Send command">
          <CornerDownLeft aria-hidden="true" />
        </Button>
      </form>
    </div>
  )
}

export { ReplConsole }
export type { ReplConsoleProps }
