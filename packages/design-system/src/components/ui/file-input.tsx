import { useId } from "react"

import { buttonVariants } from "@nexus-tools/design-system/components/ui/button"
import { cn } from "@nexus-tools/design-system/lib/utils"

import type { VariantProps } from "class-variance-authority"

// `size` is omitted from the native input props too — `<input size>` is a real HTML attribute (character width), and it collides with the trigger's `size` variant below.
type FileInputProps = Omit<React.ComponentProps<"input">, "type" | "className" | "size"> &
  VariantProps<typeof buttonVariants> & {
    /** The visible trigger's content — usually an icon plus a label. */
    children: React.ReactNode
    /** Classes for the visible trigger. The input itself is never styled. */
    className?: string
  }

/** A styled trigger for a native file picker. */
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
