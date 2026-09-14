import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Briefcase, ArrowRight } from "@phosphor-icons/react"
import { Button } from "@/ui-shared/components/ui/button"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import EmptyState from "@/ui-shared/components/EmptyState"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import JobStatusBadge from "@/ui-external/employer-job-management/components/JobStatusBadge"
import { getModerationJobs } from "@/client"
import type { JobStatus, ModerationJobListItemDto } from "@/client/types.gen"
import { formatDate, formatDeadline } from "@/ui-shared/format/DateFormat"

const STATUS_FILTERS: Array<{ label: string; value: JobStatus | null }> = [
  { label: "All", value: null },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Deleted", value: "DELETED" },
]

export default function ModerationJobsPage() {
  const navigate = useNavigate()

  const [jobs, setJobs] = useState<ModerationJobListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<JobStatus | null>("PENDING_APPROVAL")

  const fetchJobs = async (status: JobStatus | null) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getModerationJobs({
        query: status ? { status } : undefined,
        throwOnError: true,
      })
      setJobs(res.data?.items ?? [])
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load job postings. Please try again later."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs(statusFilter)
  }, [statusFilter])

  const activeLabel =
    STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "this status"

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
          Job Moderation
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Review job postings before they go public. Approve valid ones, or
          reject/delete postings that violate platform rules.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(({ label, value }) => (
          <Button
            key={label}
            variant={statusFilter === value ? "default" : "outline"}
            onClick={() => setStatusFilter(value)}
            className={`h-8 rounded-none px-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              statusFilter === value
                ? "bg-brand text-white hover:bg-brand/90"
                : "border-foreground/20 text-foreground/70 hover:border-brand hover:text-brand"
            }`}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && <ErrorAlert title="Moderation Error" message={error} />}

      {loading ? (
        <Card className="border border-foreground/10 bg-card shadow-sm">
          <CardContent className="py-12">
            <LoadingSpinner message="Loading job postings..." />
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={40} />}
          title="No Job Postings Found"
          description={`There are no job postings with status "${activeLabel}".`}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <button
              key={job.jobId}
              onClick={() => navigate(`/admin/jobs/${job.jobId}`)}
              className="group w-full border border-foreground/10 bg-card p-5 text-left transition-all duration-200 hover:border-brand/40 hover:shadow-sm cursor-pointer"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-bold tracking-tight text-foreground">
                      {job.title}
                    </h3>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {job.companyName}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-5 text-[11px] font-medium text-muted-foreground">
                  <span>Posted {formatDate(job.createdAt)}</span>
                  <span>Deadline {formatDeadline(job.deadline)}</span>
                  <ArrowRight
                    size={15}
                    className="text-foreground/40 transition-colors group-hover:text-brand"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}