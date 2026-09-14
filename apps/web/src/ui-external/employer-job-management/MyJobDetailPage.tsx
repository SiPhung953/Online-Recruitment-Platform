import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle, Users, WarningCircle } from "@phosphor-icons/react"
import Header from "@/ui-external/landing/components/Header"
import Footer from "@/ui-external/landing/components/Footer"
import { Button } from "@/ui-shared/components/ui/button"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import { Separator } from "@/ui-shared/components/ui/separator"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import ConfirmationDialog from "@/ui-shared/components/ConfirmationDialog"
import {
  getMyJobDetail,
  closeJobPosting,
  reopenJobPosting,
  deleteJobPosting,
} from "@/client"
import type { GetMyJobDetailResponse } from "@/client/types.gen"
import { formatDate, formatDeadline, isPastDeadline } from "@/ui-shared/format/DateFormat"
import { formatEmploymentType } from "@/ui-shared/format/EmploymentTypeFormat"
import JobStatusBadge from "./components/JobStatusBadge"
import { getAvailableActions, type JobAction } from "./jobActions"
import { DIALOG_COPY } from "./jobActionCopy"

const ACTION_LABELS: Record<JobAction, string> = {
  EDIT: "Edit",
  CLOSE: "Close",
  REOPEN: "Re-open",
  DELETE: "Delete",
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function MyJobDetailPage() {
  const { jobId = "" } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState<GetMyJobDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [pending, setPending] = useState<Exclude<JobAction, "EDIT"> | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchJob = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getMyJobDetail({ path: { jobId }, throwOnError: true })
      setJob(res.data ?? null)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load this job posting. Please try again later."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJob()
  }, [jobId])

  // EDIT navigates; the other three need confirmation first.
  const handleAction = (action: JobAction) => {
    if (action === "EDIT") {
      navigate(`/employer/jobs/${jobId}/edit`)
      return
    }
    setPending(action)
  }

  const handleConfirm = async () => {
    if (!pending) return

    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const args = { path: { jobId }, throwOnError: true } as const

      if (pending === "CLOSE") {
        await closeJobPosting(args)
      } else if (pending === "REOPEN") {
        await reopenJobPosting(args)
      } else {
        await deleteJobPosting(args)
        // A deleted posting has no actions left and nothing more to show here,
        // so the list is the only useful place to land.
        navigate("/employer/jobs")
        return
      }

      await fetchJob()
      setSuccessMessage(DIALOG_COPY[pending].successMessage)
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

  const actions = job ? getAvailableActions(job.status) : []
  const deadlinePassed = job ? isPastDeadline(job.deadline) : false

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      <Header />

      <main className="flex-1 bg-secondary/35 py-10">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/employer/jobs")}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand"
          >
            <ArrowLeft size={13} weight="bold" />
            Back to My Job Postings
          </button>

          {successMessage && (
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle size={16} weight="fill" className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && <ErrorAlert title="Job Posting Error" message={error} />}

          {loading ? (
            <Card className="border border-foreground/10 bg-card shadow-sm">
              <CardContent className="py-12">
                <LoadingSpinner message="Loading job posting..." />
              </CardContent>
            </Card>
          ) : !job ? (
            !error && <ErrorAlert title="Job Posting Error" message="Job posting not found." />
          ) : (
            <>
              {/* Heading + actions */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
                      {job.title}
                    </h1>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Posted {formatDate(job.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions.map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      onClick={() => handleAction(action)}
                      className={`h-9 rounded-none border-foreground/10 px-3 text-[11px] font-bold uppercase tracking-wider ${
                        action === "DELETE"
                          ? "text-destructive hover:border-destructive/40 hover:text-destructive"
                          : "text-foreground hover:border-brand/40 hover:text-brand"
                      }`}
                    >
                      {ACTION_LABELS[action]}
                    </Button>
                  ))}

                  <Button
                    onClick={() => navigate(`/employer/jobs/${jobId}/applications`)}
                    className="h-9 gap-1.5 rounded-none bg-brand px-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-brand/90"
                  >
                    <Users size={14} weight="bold" />
                    View Applicants
                  </Button>
                </div>
              </div>

              {/* A rejected posting is the one case where the employer has to be
                  told *why* before the Edit button means anything (UC-EMP-03). */}
              {job.status === "REJECTED" && job.rejectionReason && (
                <div className="flex items-start gap-3 border-l-2 border-destructive/40 bg-destructive/5 px-4 py-3">
                  <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                      Rejected by a Moderator
                    </p>
                    <p className="text-xs leading-relaxed text-foreground">
                      {job.rejectionReason}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Edit the posting to address this; saving sends it back for approval.
                    </p>
                  </div>
                </div>
              )}

              <Card className="border border-foreground/10 bg-card shadow-sm">
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-2">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Job Description
                    </h2>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                      {job.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Candidate Requirements
                    </h2>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                      {job.requirement}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                    <MetaRow
                      label="Employment Type"
                      value={formatEmploymentType(job.employmentType)}
                    />
                    <MetaRow label="Location" value={job.location || "—"} />
                    <div className={deadlinePassed ? "text-orange-600" : ""}>
                      <MetaRow
                        label="Deadline"
                        value={
                          deadlinePassed
                            ? `${formatDeadline(job.deadline)} (passed)`
                            : formatDeadline(job.deadline)
                        }
                      />
                    </div>
                    <MetaRow label="Last Updated" value={formatDate(job.updatedAt)} />
                    {job.approvedAt && (
                      <MetaRow label="Approved" value={formatDate(job.approvedAt)} />
                    )}
                    {job.rejectedAt && (
                      <MetaRow label="Rejected" value={formatDate(job.rejectedAt)} />
                    )}
                    {job.closedAt && <MetaRow label="Closed" value={formatDate(job.closedAt)} />}
                    {job.deletedAt && (
                      <MetaRow label="Deleted" value={formatDate(job.deletedAt)} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      <ConfirmationDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        isLoading={actionLoading}
        title={pending ? DIALOG_COPY[pending].title : ""}
        message={pending ? DIALOG_COPY[pending].message : ""}
        confirmLabel={pending ? DIALOG_COPY[pending].confirmLabel : "Confirm"}
        cancelLabel="Cancel"
        isDestructive={pending ? DIALOG_COPY[pending].isDestructive : false}
      />

      <Footer />
    </div>
  )
}
