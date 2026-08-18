import { useId } from "react"


import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { VariantProps } from "class-variance-authority"

// `size` is omitted from the native input props too — `<input size>` is a
// real HTML attribute (character width), and it collides with the trigger's
// `size` variant below.
type FileInputProps = Omit<React.ComponentProps<"input">, "type" | "className" | "size"> &
  VariantProps<typeof buttonVariants> & {
    /** The visible trigger's content — usually an icon plus a label. */
    children: React.ReactNode
    /** Classes for the visible trigger. The input itself is never styled. */
    className?: string
  }

/**
 * A styled trigger for a native file picker.
 *
 * Three places in obo-nexus (`profile-editor.tsx`'s avatar upload,
 * `markdown-io-buttons.tsx`'s import, `image-plugin.tsx`'s insert-image) hand
 * built the identical pattern: a real `<button>`, a `<input type="file"
 * className="hidden">` next to it with no `<label>`, a `ref`, and an
 * `onClick={() => ref.current?.click()}` to bridge them.
 *
 * That bridge is unnecessary and loses the platform's own mechanism: a
 * `<label for>` pointed at a file input already opens the picker on click,
 * with no JS. This uses that — `sr-only` rather than `hidden` on the input,
 * so it stays in the tab order and answers Enter/Space itself, and the
 * `<label>` is styled as the button. Keyboard and mouse both work without a
 * ref.
 */
function FileInput({ children, variant = "outline", size, id, className, ...props }: FileInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="inline-flex">
      <label htmlFor={inputId} className={cn(buttonVariants({ variant, size }), "cursor-pointer", className)}>
        {children}
      </label>
      <input id={inputId} type="file" className="sr-only" {...props} />
    </div>
  )
}

export { FileInput }
export type { FileInputProps }
