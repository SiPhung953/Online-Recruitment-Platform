import { ArrowRight, FileText } from "@phosphor-icons/react"
import { Button } from "@/ui-shared/components/ui/button"
import type { EmployerApplicationListItemDto } from "@/client/types.gen"
import ApplicationStatusBadge from "@/ui-external/applications/components/ApplicationStatusBadge"
import { formatDate } from "@/ui-shared/format/DateFormat"

interface ApplicationsTableProps {
  applications: EmployerApplicationListItemDto[]
  onReview: (applicationId: string) => void
}

const HEAD_CLASS =
  "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground"

/**
 * A real `<table>` rather than the card layout used elsewhere: a shortlist is
 * compared down a column — every candidate's status, every applied date — and
 * that is the one job a table does better than stacked cards.
 *
 * The horizontal scroll wrapper keeps the narrow-screen layout honest instead
 * of letting the table push the whole page sideways.
 */
export default function ApplicationsTable({
  applications,
  onReview,
}: ApplicationsTableProps) {
  return (
    <div className="overflow-x-auto border border-foreground/10 bg-card">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="border-b border-foreground/10 bg-secondary/40">
          <tr>
            <th scope="col" className={HEAD_CLASS}>
              Candidate
            </th>
            <th scope="col" className={HEAD_CLASS}>
              Applied
            </th>
            <th scope="col" className={HEAD_CLASS}>
              CV Submitted
            </th>
            <th scope="col" className={HEAD_CLASS}>
              Status
            </th>
            <th scope="col" className={`${HEAD_CLASS} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {applications.map((application) => (
            <tr
              key={application.applicationId}
              className="border-b border-foreground/5 transition-colors last:border-b-0 hover:bg-brand/5"
            >
              <td className="px-4 py-3.5">
                <p className="text-xs font-bold text-foreground">
                  {application.candidateName || "Unnamed candidate"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {application.candidateEmail}
                </p>
              </td>

              <td className="px-4 py-3.5 text-[11px] font-medium text-muted-foreground">
                {formatDate(application.appliedAt)}
              </td>

              <td className="px-4 py-3.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                  <FileText size={13} className="shrink-0 text-muted-foreground" />
                  <span className="max-w-[200px] truncate">{application.resumeTitle}</span>
                </span>
              </td>

              <td className="px-4 py-3.5">
                <ApplicationStatusBadge status={application.applicationStatus} />
              </td>

              <td className="px-4 py-3.5 text-right">
                <Button
                  variant="outline"
                  onClick={() => onReview(application.applicationId)}
                  className="h-8 gap-1.5 rounded-none border-foreground/10 px-3 text-[11px] font-bold uppercase tracking-wider text-foreground hover:border-brand/40 hover:text-brand"
                >
                  Review
                  <ArrowRight size={13} weight="bold" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
