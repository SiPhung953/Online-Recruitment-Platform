import { useEffect, useState } from "react"
import { CircleNotch } from "@phosphor-icons/react"
import { Button } from "@/ui-shared/components/ui/button"
import { Textarea } from "@/ui-shared/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui-shared/components/ui/dialog"

export type Decision = "ACCEPTED" | "REJECTED"

interface DecisionDialogProps {
  /** The decision awaiting confirmation, or `null` when the dialog is closed. */
  decision: Decision | null
  candidateName: string
  onClose: () => void
  onConfirm: (rejectionReason?: string) => void
  isLoading?: boolean
}

/**
 * Confirms accepting or rejecting one application (UC-EMP-08).
 *
 * `ConfirmationDialog` could not be reused because a rejection carries a
 * reason, and that component takes only a static string.
 *
 * One `decision` prop carries both "is the dialog open" and "which decision",
 * so the two can never disagree — there is no way to represent an open dialog
 * with no decision attached.
 */
export default function DecisionDialog({
  decision,
  candidateName,
  onClose,
  onConfirm,
  isLoading = false,
}: DecisionDialogProps) {
  const [reason, setReason] = useState("")

  // Clear the box each time the dialog opens, so a reason typed for one
  // candidate never reappears under another.
  useEffect(() => {
    if (decision) setReason("")
  }, [decision])

  const isRejection = decision === "REJECTED"

  return (
    <Dialog
      open={decision !== null}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose()
      }}
    >
      <DialogContent showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle>
            {isRejection ? "Reject Application" : "Accept Application"}
          </DialogTitle>
          <DialogDescription>
            {isRejection ? (
              <>
                Are you sure you want to reject <strong>{candidateName}</strong>? A
                rejected application cannot be reopened.
              </>
            ) : (
              <>
                Are you sure you want to accept <strong>{candidateName}</strong>? An
                accepted application cannot be changed afterwards.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isRejection && (
          <div className="space-y-2">
            <label
              htmlFor="decision-reason"
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Reason for rejection <span className="font-medium">(optional)</span>
            </label>
            <Textarea
              id="decision-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. We are looking for more experience with distributed systems."
              rows={4}
              maxLength={1000}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-right text-[10px] text-muted-foreground">
              {reason.length} / 1000
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isRejection ? "destructive" : "default"}
            onClick={() => onConfirm(isRejection ? reason.trim() || undefined : undefined)}
            disabled={isLoading}
            className={`gap-2 ${isRejection ? "" : "bg-brand text-white hover:bg-brand/90"}`}
          >
            {isLoading && <CircleNotch size={13} className="animate-spin" />}
            {isRejection ? "Yes, Reject" : "Yes, Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
