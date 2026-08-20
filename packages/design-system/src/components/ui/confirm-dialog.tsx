import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@nexus-tools/design-system/components/ui/alert-dialog"
import { buttonVariants } from "@nexus-tools/design-system/components/ui/button"
import { Spinner } from "@nexus-tools/design-system/components/ui/spinner"
import { cn } from "@nexus-tools/design-system/lib/utils"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` styles the confirm button as destructive. */
  tone?: "danger" | "default"
  /** Awaited, so the button can show progress until it settles. */
  onConfirm: () => void | Promise<void>
  pending?: boolean
}

/** Blocking confirmation for an action that cannot be undone. */
function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-slot="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            // Not onOpenChange(false): the caller closes once the work settles, so the dialog cannot vanish while the action is still in flight.
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
            className={cn(
              buttonVariants({ variant: tone === "danger" ? "destructive" : "default" })
            )}
          >
            {pending && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ConfirmDialog }
