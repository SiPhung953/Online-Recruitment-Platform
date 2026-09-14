import { CalendarBlank, MapPin, Briefcase, ArrowRight } from "@phosphor-icons/react"
import { Button } from "@/ui-shared/components/ui/button"
import type { MyJobListItemDto } from "@/client/types.gen"
import JobStatusBadge, { type JobStatus } from "./JobStatusBadge"
import { getAvailableActions, type JobAction } from "../jobActions"
import { formatDate, formatDeadline, isPastDeadline } from "@/ui-shared/format/DateFormat"
import { formatEmploymentType } from "@/ui-shared/format/EmploymentTypeFormat"

interface JobPostingCardProps {
  job: MyJobListItemDto
  onView: (jobId: string) => void
  onAction: (action: JobAction, job: MyJobListItemDto) => void
}

const ACTION_LABELS: Record<JobAction, string> = {
  EDIT: "Edit",
  CLOSE: "Close",
  REOPEN: "Re-open",
  DELETE: "Delete",
}

export default function JobPostingCard({ job, onView, onAction }: JobPostingCardProps) {
  const actions = getAvailableActions(job.status as JobStatus)
  const deadlinePassed = isPastDeadline(job.deadline)

  return (
    <div className="group border border-foreground/10 bg-card p-5 transition-all duration-300 hover:border-brand/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: title, status, metadata */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold tracking-tight text-foreground">
              {job.title}
            </h3>
            <JobStatusBadge status={job.status as JobStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase size={13} />
              {formatEmploymentType(job.employmentType)}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 ${
                deadlinePassed ? "text-orange-600" : ""
              }`}
            >
              <CalendarBlank size={13} />
              Deadline {formatDeadline(job.deadline)}
            </span>
          </div>

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Posted {formatDate(job.createdAt)}
          </p>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              variant="outline"
              onClick={() => onAction(action, job)}
              className={`h-8 rounded-none border-foreground/10 px-3 text-[11px] font-bold uppercase tracking-wider ${
                action === "DELETE"
                  ? "text-destructive hover:border-destructive/40 hover:text-destructive"
                  : "text-foreground hover:border-brand/40 hover:text-brand"
              }`}
            >
              {ACTION_LABELS[action]}
            </Button>
          ))}

          <Button
            onClick={() => onView(job.jobId)}
            className="h-8 gap-1.5 rounded-none bg-brand px-3 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-brand/90"
          >
            View
            <ArrowRight size={13} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  )
}
