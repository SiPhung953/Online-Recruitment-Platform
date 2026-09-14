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

interface DeleteJobDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deletionReason: string) => void
  isLoading?: boolean
}

export default function DeleteJobDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteJobDialogProps) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (isOpen) setReason("")
  }, [isOpen])

  const canConfirm = reason.trim().length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Job Posting</DialogTitle>
          <DialogDescription>
            This is a <strong>soft delete</strong>: the posting leaves the
            public site and stops accepting applications, but submitted
            applications are kept. Record the reason for future reference.
          </DialogDescription>
        </DialogHeader>

        <label htmlFor="deletion-reason" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Reason for deletion
        </label>
        <Textarea
          id="deletion-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Violates platform guidelines."
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
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}