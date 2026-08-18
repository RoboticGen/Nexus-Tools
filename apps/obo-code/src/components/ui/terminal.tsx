import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

type TerminalProps = Omit<React.ComponentProps<"div">, "children" | "title"> & {
  /** The scrollback. Newlines are preserved. */
  output: string
  /** Shown when `output` is empty. */
  placeholder?: string
  /** Names the log region. Required — two terminals otherwise sound alike. */
  label: string
  /**
   * Announces appended output to screen readers. Leave off for high-frequency
   * streams: an assertive-ish live region firing on every chunk is unusable.
   */
  announce?: boolean
  /** Pins to the bottom as output arrives, unless the user has scrolled up. */
  followTail?: boolean
  rows?: number
}

/**
 * Read-only console output.
 *
 * Both Nexus-Tools apps render this as `<textarea className="terminal-output"
 * readOnly value={output} />`, which has four problems: a textarea is a form
 * control, so screen readers offer to edit it and announce it as a text box; it
 * has no accessible name; it never scrolls to new output, so a running program
 * writes off-screen; and its content is exempt from find-in-page.
 *
 * This is a `log` region instead — the ARIA role for exactly this — with
 * opt-in tail-following that yields as soon as the user scrolls up to read
 * something.
 */
function Terminal({
  output,
  placeholder = "No output yet.",
  label,
  announce = false,
  followTail = true,
  rows = 12,
  className,
  ...props
}: TerminalProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)

  // Layout effect, not effect: scrolling after paint shows one frame of the
  // old position and reads as a jump.
  useLayoutEffect(() => {
    const element = scroller.current
    if (!element || !followTail || !pinned) return

    element.scrollTop = element.scrollHeight
  }, [output, followTail, pinned])

  useEffect(() => {
    const element = scroller.current
    if (!element) return

    // Re-pin only when the user returns to the bottom. Without this, following
    // the tail fights anyone trying to read earlier output — the reason the
    // original never auto-scrolled at all is probably that this is fiddly.
    const onScroll = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight
      setPinned(distance < 24)
    }

    element.addEventListener("scroll", onScroll, { passive: true })
    return () => element.removeEventListener("scroll", onScroll)
  }, [])

  const empty = output.length === 0

  return (
    <div
      data-slot="terminal"
      className={cn(
        "bg-muted/60 border-border overflow-hidden rounded-lg border",
        className
      )}
      {...props}
    >
      <div
        ref={scroller}
        // `log` is the role for an append-only running record. tabIndex makes
        // the scroll container keyboard-reachable, which a scrollable region
        // must be.
        role="log"
        aria-label={label}
        aria-live={announce ? "polite" : "off"}
        tabIndex={0}
        style={{ maxHeight: `calc(${rows} * 1.5rem)` }}
        className="focus-ring overflow-auto p-3"
      >
        <pre
          className={cn(
            "font-mono text-xs leading-6 whitespace-pre-wrap",
            empty && "text-muted-foreground"
          )}
        >
          {empty ? placeholder : output}
        </pre>
      </div>
    </div>
  )
}

export { Terminal }
