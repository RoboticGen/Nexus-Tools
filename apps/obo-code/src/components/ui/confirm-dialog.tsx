import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

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

/**
 * Blocking confirmation for an action that cannot be undone.
 *
 * Generalises obo-nexus's `discard-dialog` (6 uses), which hard-coded the
 * discard-changes copy and — despite being a destructive prompt — styled its
 * confirm button as a plain default.
 *
 * Built on AlertDialog rather than Dialog, which is the meaningful difference:
 * `role="alertdialog"`, and focus lands on Cancel so a stray Enter dismisses
 * rather than destroys. Two of the bespoke confirms in obo-nexus reimplemented
 * Radix's Dialog internals by hand purely to raise their z-index; the ladder
 * makes that unnecessary.
 */
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
            // Not onOpenChange(false): the caller closes once the work
            // settles, so the dialog cannot vanish while the action is still
            // in flight.
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
