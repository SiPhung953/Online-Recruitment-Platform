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

interface RejectJobDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (rejectionReason: string) => void
  isLoading?: boolean
}

export default function RejectJobDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: RejectJobDialogProps) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (isOpen) setReason("")
  }, [isOpen])

  const canConfirm = reason.trim().length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Job Posting</DialogTitle>
          <DialogDescription>
            The job posting will be set to <strong>Rejected</strong> and the
            employer will see the reason below. This requirement is mandatory.
          </DialogDescription>
        </DialogHeader>

        <label htmlFor="rejection-reason" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Reason for rejection
        </label>
        <Textarea
          id="rejection-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Description does not meet platform quality standards."
          maxLength={500}
          disabled={isLoading}
          autoFocus
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm || isLoading}
            className="gap-2"
          >
            {isLoading && <CircleNotch size={13} className="animate-spin" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}