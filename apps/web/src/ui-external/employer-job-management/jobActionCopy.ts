import type { JobAction } from "./jobActions"

interface JobActionCopy {
  title: string
  message: string
  confirmLabel: string
  isDestructive: boolean
  successMessage: string
}

/**
 * Confirmation copy for the three actions that mutate a posting.
 *
 * Kept out of the pages because both the list and the detail page offer the
 * same actions — one source of wording means the two screens cannot drift
 * apart, and `Record<Exclude<JobAction, "EDIT">, ...>` makes the compiler
 * insist on copy for every action that is not a plain navigation.
 */
export const DIALOG_COPY: Record<Exclude<JobAction, "EDIT">, JobActionCopy> = {
  CLOSE: {
    title: "Close Job Posting",
    message:
      "Are you sure you want to close this job posting? Job Seekers will no longer be able to apply, but applications already submitted will be kept.",
    confirmLabel: "Yes, Close",
    isDestructive: false,
    successMessage: "Job posting closed successfully.",
  },
  REOPEN: {
    title: "Re-open Job Posting",
    message:
      "Are you sure you want to re-open this job posting? It will be sent back to a Moderator for approval before it appears publicly again.",
    confirmLabel: "Yes, Re-open",
    isDestructive: false,
    successMessage: "Job posting sent back for approval.",
  },
  DELETE: {
    title: "Delete Job Posting",
    message:
      "Are you sure you want to delete this job posting? It will no longer be visible publicly and cannot accept new applications. Applications already received are kept.",
    confirmLabel: "Yes, Delete",
    isDestructive: true,
    successMessage: "Job posting deleted successfully.",
  },
}
