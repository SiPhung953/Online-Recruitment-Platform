import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Briefcase, Plus, CheckCircle } from "@phosphor-icons/react"
import Header from "@/ui-external/landing/components/Header"
import Footer from "@/ui-external/landing/components/Footer"
import { Button } from "@/ui-shared/components/ui/button"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import EmptyState from "@/ui-shared/components/EmptyState"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import ConfirmationDialog from "@/ui-shared/components/ConfirmationDialog"
import {
  getMyJobs,
  closeJobPosting,
  reopenJobPosting,
  deleteJobPosting,
} from "@/client"
import type { MyJobListItemDto } from "@/client/types.gen"
import JobPostingCard from "./components/JobPostingCard"
import type { JobAction } from "./jobActions"
import { DIALOG_COPY } from "./jobActionCopy"

export default function MyJobPostingsPage() {
  const navigate = useNavigate()

  const [jobs, setJobs] = useState<MyJobListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Which action is awaiting confirmation, and on which job.
  const [pending, setPending] = useState<{
    action: Exclude<JobAction, "EDIT">
    job: MyJobListItemDto
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchJobs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getMyJobs({ throwOnError: true })
      setJobs(res.data?.items ?? [])
      return true
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load your job postings. Please try again later.")
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  // EDIT navigates; the other three need confirmation first.
  const handleAction = (action: JobAction, job: MyJobListItemDto) => {
    if (action === "EDIT") {
      navigate(`/employer/jobs/${job.jobId}/edit`)
      return
    }
    setPending({ action, job })
  }

  const handleConfirm = async () => {
    if (!pending) return
    const { action, job } = pending

    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const args = { path: { jobId: job.jobId }, throwOnError: true } as const

      if (action === "CLOSE") {
        await closeJobPosting(args)
      } else if (action === "REOPEN") {
        await reopenJobPosting(args)
      } else {
        await deleteJobPosting(args)
      }

      // Make the list reflect the change that just succeeded.
      if (await fetchJobs()) setSuccessMessage(DIALOG_COPY[action].successMessage)
      // Future work consideration: Update status in local UI state for instant UI feedback in place of awaiting request.
      // Similar to setApplication in MyApplicationPage
      // setJobs((prevJobs) => prevJobs.map((item) => if (item.jobId !== job.jobId) return item
      // ...
      // const newStatus: JobStatus

      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to update the job posting. Please try again."
      )
    } finally {
      setActionLoading(false)
      setPending(null)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      <Header />

      <main className="flex-1 bg-secondary/35 py-10">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Page heading + primary action */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
                My Job Postings
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage the roles you have published, track their moderation status, and
                review applicants.
              </p>
            </div>

            <Button
              onClick={() => navigate("/employer/jobs/new")}
              className="h-10 shrink-0 gap-2 rounded-none bg-brand px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-brand/90"
            >
              <Plus size={15} weight="bold" />
              Post a Job
            </Button>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle size={16} weight="fill" className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && <ErrorAlert title="Job Postings Error" message={error} />}

          {loading ? (
            <Card className="border border-foreground/10 bg-card shadow-sm">
              <CardContent className="py-12">
                <LoadingSpinner message="Loading your job postings..." />
              </CardContent>
            </Card>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={40} />}
              title="No Job Postings Yet"
              description="You haven't published any roles. Create your first job posting to start receiving applications."
              actionLabel="Post a Job"
              onActionClick={() => navigate("/employer/jobs/new")}
            />
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobPostingCard
                  key={job.jobId}
                  job={job}
                  onView={(jobId) => navigate(`/employer/jobs/${jobId}`)}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmationDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        isLoading={actionLoading}
        title={pending ? DIALOG_COPY[pending.action].title : ""}
        message={pending ? DIALOG_COPY[pending.action].message : ""}
        confirmLabel={pending ? DIALOG_COPY[pending.action].confirmLabel : "Confirm"}
        cancelLabel="Cancel"
        isDestructive={pending ? DIALOG_COPY[pending.action].isDestructive : false}
      />

      <Footer />
    </div>
  )
}
