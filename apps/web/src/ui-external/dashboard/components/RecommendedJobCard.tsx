import { Link } from "react-router-dom"
import { MapPin, ArrowRight, Sparkle } from "@phosphor-icons/react"
import type { RecommendedJobDto } from "@/client/types.gen"
import { formatEmploymentType } from "@/ui-shared/format/EmploymentTypeFormat"
import { companyInitial } from "@/ui-shared/format/CompanyInitial"

interface RecommendedJobCardProps {
  job: RecommendedJobDto
}

/**
 * One recommendation, as a row.
 *
 * A row rather than a grid cell because the dashboard slot is a narrow column;
 * the three-up card grid on the landing page would be cramped here.
 *
 * The `reasons` chips are the point of this component. A recommender that
 * cannot say why it chose something is indistinguishable from a random list,
 * so the explanation travels with the result rather than being implied.
 */
export default function RecommendedJobCard({ job }: RecommendedJobCardProps) {
  return (
    <div className="group relative border border-foreground/10 bg-card p-4 transition-all duration-300 hover:border-brand/40">
      <div className="flex items-start gap-3">
        {/* Company initial, since no logo is stored */}
        <div className="flex size-10 shrink-0 items-center justify-center bg-brand text-sm font-bold text-white">
          {companyInitial(job.company.name)}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <h4 className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-brand">
                <Link to={`/jobs/${job.id}`} className="hover:underline">
                  {job.title}
                </Link>
              </h4>
              <Link
                to={`/companies/${job.company.id}`}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {job.company.name}
              </Link>
            </div>

            <Link to={`/jobs/${job.id}`} className="shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand transition-transform group-hover:translate-x-0.5">
                View
                <ArrowRight size={11} weight="bold" />
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {job.location}
            </span>
            <span className="text-muted-foreground/30">&middot;</span>
            <span>{formatEmploymentType(job.employmentType)}</span>
          </div>

          {job.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {job.reasons.map((reason) => (
                <span
                  key={reason}
                  className="inline-flex items-center gap-1 border border-brand/20 bg-brand/5 px-2 py-0.5 text-[10px] font-medium text-brand"
                >
                  <Sparkle size={10} weight="fill" />
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
