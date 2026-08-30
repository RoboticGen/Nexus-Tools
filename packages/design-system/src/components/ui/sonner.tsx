import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Toast host. Mount once, near the root. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          zIndex: "var(--z-toast)",
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Tinted surfaces rather than solid fills: a toast is transient and a full-strength block of colour is heavy-handed for it.
          "--success-bg": "color-mix(in oklab, var(--tone-success) 12%, var(--popover))",
          "--success-text": "var(--tone-success-contrast)",
          "--success-border": "color-mix(in oklab, var(--tone-success) 25%, transparent)",
          "--info-bg": "color-mix(in oklab, var(--tone-info) 12%, var(--popover))",
          "--info-text": "var(--tone-info-contrast)",
          "--info-border": "color-mix(in oklab, var(--tone-info) 25%, transparent)",
          "--warning-bg": "color-mix(in oklab, var(--tone-warning) 12%, var(--popover))",
          "--warning-text": "var(--tone-warning-contrast)",
          "--warning-border": "color-mix(in oklab, var(--tone-warning) 25%, transparent)",
          "--error-bg": "color-mix(in oklab, var(--tone-danger) 12%, var(--popover))",
          "--error-text": "var(--tone-danger-contrast)",
          "--error-border": "color-mix(in oklab, var(--tone-danger) 25%, transparent)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast" } }}
      {...props}
    />
  )
}

export { Toaster }
