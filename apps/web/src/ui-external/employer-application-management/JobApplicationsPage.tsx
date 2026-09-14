import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Users } from "@phosphor-icons/react"
import Header from "@/ui-external/landing/components/Header"
import Footer from "@/ui-external/landing/components/Footer"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import EmptyState from "@/ui-shared/components/EmptyState"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import { getJobApplications, getMyJobDetail } from "@/client"
import type { EmployerApplicationListItemDto } from "@/client/types.gen"
import JobStatusBadge, {
  type JobStatus,
} from "@/ui-external/employer-job-management/components/JobStatusBadge"
import ApplicationsTable from "./components/ApplicationsTable"

export default function JobApplicationsPage() {
  const { jobId = "" } = useParams()
  const navigate = useNavigate()

  const [applications, setApplications] = useState<EmployerApplicationListItemDto[]>([])
  const [jobTitle, setJobTitle] = useState("")
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        // The list endpoint returns applicants but not the job they applied to,
        // so the heading needs a second call. They are independent, so they run
        // together rather than one after the other.
        const [applicationsRes, jobRes] = await Promise.all([
          getJobApplications({ path: { jobId }, throwOnError: true }),
          getMyJobDetail({ path: { jobId }, throwOnError: true }),
        ])

        setApplications(applicationsRes.data?.items ?? [])
        setJobTitle(jobRes.data?.title ?? "")
        setJobStatus(jobRes.data?.status ?? null)
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load the applications for this job posting. Please try again later."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [jobId])

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      <Header />

      <main className="flex-1 bg-secondary/35 py-10">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(`/employer/jobs/${jobId}`)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand"
          >
            <ArrowLeft size={13} weight="bold" />
            Back to Job Posting
          </button>

          <div className="space-y-2">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
              Applications
            </h1>
            {jobTitle && (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-brand">{jobTitle}</p>
                {jobStatus && <JobStatusBadge status={jobStatus} />}
              </div>
            )}
            {!loading && !error && applications.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {applications.length}{" "}
                {applications.length === 1 ? "candidate has" : "candidates have"} applied.
              </p>
            )}
          </div>

          {error && <ErrorAlert title="Applications Error" message={error} />}

          {loading ? (
            <Card className="border border-foreground/10 bg-card shadow-sm">
              <CardContent className="py-12">
                <LoadingSpinner message="Loading applications..." />
              </CardContent>
            </Card>
          ) : (
            !error &&
            (applications.length === 0 ? (
              <EmptyState
                icon={<Users size={40} />}
                title="No Applications Yet"
                description="Nobody has applied to this posting. Candidates appear here as soon as they submit an application."
              />
            ) : (
              <ApplicationsTable
                applications={applications}
                onReview={(applicationId) =>
                  navigate(`/employer/applications/${applicationId}`)
                }
              />
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
