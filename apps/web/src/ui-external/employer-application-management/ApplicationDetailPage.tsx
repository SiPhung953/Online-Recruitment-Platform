import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowSquareOut,
  Briefcase,
  CheckCircle,
  Envelope,
  Eye,
  FileText,
  MapPin,
  Phone,
  X,
} from "@phosphor-icons/react"
import Header from "@/ui-external/landing/components/Header"
import Footer from "@/ui-external/landing/components/Footer"
import { Button } from "@/ui-shared/components/ui/button"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import { Separator } from "@/ui-shared/components/ui/separator"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import ConfirmationDialog from "@/ui-shared/components/ConfirmationDialog"
import {
  getJobApplicationDetail,
  putApplicationUnderReview,
  updateApplicationStatus,
} from "@/client"
import type { EmployerApplicationResponse } from "@/client/types.gen"
import ApplicationStatusBadge from "@/ui-external/applications/components/ApplicationStatusBadge"
import { formatDate } from "@/ui-shared/format/DateFormat"
import { API_BASE_URL } from "@/api/ApiBaseUrl"
import DecisionDialog, { type Decision } from "./components/DecisionDialog"

/** Why the two decision buttons are absent, for every status that hides them. */
const BLOCKED_REASON: Record<string, string> = {
  WITHDRAWN: "The candidate withdrew this application, so it can no longer be processed.",
  ACCEPTED: "This application has already been accepted and cannot be changed.",
  REJECTED: "This application has already been rejected and cannot be reopened.",
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        {value}
      </p>
    </div>
  )
}

export default function ApplicationDetailPage() {
  const { applicationId = "" } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState<EmployerApplicationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchApplication = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getJobApplicationDetail({
        path: { applicationId },
        throwOnError: true,
      })
      setApplication(res.data ?? null)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load this application. Please try again later."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplication()
  }, [applicationId])

  const handlePutUnderReview = async () => {
    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await putApplicationUnderReview({
        path: { applicationId },
        throwOnError: true,
      })
      await fetchApplication()
      setSuccessMessage(res.data?.message ?? "This application is now under review.")
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to put this application under review. Please try again."
      )
    } finally {
      setActionLoading(false)
      setShowReviewDialog(false)
    }
  }

  const handleDecision = async (rejectionReason?: string) => {
    if (!pendingDecision) return

    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await updateApplicationStatus({
        path: { applicationId },
        body: { decision: pendingDecision, rejectionReason },
        throwOnError: true,
      })
      await fetchApplication()
      setSuccessMessage(res.data?.message ?? "The application status has been updated.")
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to update the application status. Please try again."
      )
    } finally {
      setActionLoading(false)
      setPendingDecision(null)
    }
  }

  const status = application?.applicationStatus
  // The two gates the backend enforces, mirrored so the employer is never
  // offered a button that is guaranteed to come back 400 or 409.
  const canPutUnderReview = status === "SUBMITTED"
  const canDecide = status === "UNDER_REVIEW"
  const blockedReason = status ? BLOCKED_REASON[status] : undefined

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      <Header />

      <main className="flex-1 bg-secondary/35 py-10">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              application
                ? navigate(`/employer/jobs/${application.jobId}/applications`)
                : navigate("/employer/jobs")
            }
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand"
          >
            <ArrowLeft size={13} weight="bold" />
            Back to Applications
          </button>

          {successMessage && (
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle size={16} weight="fill" className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && <ErrorAlert title="Application Error" message={error} />}

          {loading ? (
            <Card className="border border-foreground/10 bg-card shadow-sm">
              <CardContent className="py-12">
                <LoadingSpinner message="Loading application..." />
              </CardContent>
            </Card>
          ) : !application ? (
            !error && <ErrorAlert title="Application Error" message="Application not found." />
          ) : (
            <>
              {/* Heading + decision actions */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
                      {application.candidateName || "Unnamed candidate"}
                    </h1>
                    <ApplicationStatusBadge status={application.applicationStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applied {formatDate(application.appliedAt)} to{" "}
                    <span className="font-bold text-brand">{application.jobTitle}</span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {canPutUnderReview && (
                    <Button
                      onClick={() => setShowReviewDialog(true)}
                      className="h-9 gap-1.5 rounded-none bg-brand px-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-brand/90"
                    >
                      <Eye size={14} weight="bold" />
                      Mark as Under Review
                    </Button>
                  )}

                  {canDecide && (
                    <>
                      <Button
                        onClick={() => setPendingDecision("ACCEPTED")}
                        className="h-9 gap-1.5 rounded-none bg-brand px-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-brand/90"
                      >
                        <CheckCircle size={14} weight="fill" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => setPendingDecision("REJECTED")}
                        variant="destructive"
                        className="h-9 gap-1.5 rounded-none px-4 text-[11px] font-bold uppercase tracking-wider"
                      >
                        <X size={14} weight="bold" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {blockedReason && (
                <p className="border-l-2 border-foreground/15 bg-foreground/[0.03] px-4 py-3 text-xs text-muted-foreground">
                  {blockedReason}
                </p>
              )}

              <Card className="border border-foreground/10 bg-card shadow-sm">
                <CardContent className="space-y-6 p-6">
                  {/* Candidate */}
                  <div className="space-y-4">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Candidate
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailRow
                        icon={<Envelope size={13} />}
                        label="Email"
                        value={application.candidateEmail}
                      />
                      <DetailRow
                        icon={<Phone size={13} />}
                        label="Phone"
                        value={application.candidatePhoneNumber || "Not provided"}
                      />
                      <DetailRow
                        icon={<MapPin size={13} />}
                        label="City"
                        value={application.candidateCity || "Not provided"}
                      />
                      <DetailRow
                        icon={<Briefcase size={13} />}
                        label="Headline"
                        value={application.candidateHeadline || "Not provided"}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* CV — the one the candidate chose when applying, not their whole library */}
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Submitted CV
                    </h2>
                    <div className="flex flex-wrap items-center justify-between gap-3 border border-foreground/10 bg-secondary/30 px-4 py-3">
                      <span className="inline-flex min-w-0 items-center gap-2 text-xs font-bold text-foreground">
                        <FileText size={16} className="shrink-0 text-brand" />
                        <span className="truncate">{application.resumeTitle}</span>
                      </span>
                      <a
                        href={`${API_BASE_URL}${application.resumeFileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 border border-foreground/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground transition-colors hover:border-brand/40 hover:text-brand"
                      >
                        Open CV
                        <ArrowSquareOut size={13} weight="bold" />
                      </a>
                    </div>
                  </div>

                  <Separator />

                  {/* Job posting */}
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Job Posting
                    </h2>
                    <button
                      type="button"
                      onClick={() => navigate(`/employer/jobs/${application.jobId}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand transition-opacity hover:opacity-80"
                    >
                      {application.jobTitle}
                      <ArrowSquareOut size={13} weight="bold" />
                    </button>
                  </div>

                  <Separator />

                  {/* What happened, and when */}
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      History
                    </h2>
                    <div className="grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
                      <div className="flex justify-between gap-4 py-1.5">
                        <span className="text-muted-foreground">Applied</span>
                        <span className="font-medium">{formatDate(application.appliedAt)}</span>
                      </div>
                      {application.underReviewAt && (
                        <div className="flex justify-between gap-4 py-1.5">
                          <span className="text-muted-foreground">Put under review</span>
                          <span className="font-medium">
                            {formatDate(application.underReviewAt)}
                          </span>
                        </div>
                      )}
                      {application.decidedAt && (
                        <div className="flex justify-between gap-4 py-1.5">
                          <span className="text-muted-foreground">Decision made</span>
                          <span className="font-medium">
                            {formatDate(application.decidedAt)}
                          </span>
                        </div>
                      )}
                      {application.withdrawnAt && (
                        <div className="flex justify-between gap-4 py-1.5">
                          <span className="text-muted-foreground">Withdrawn</span>
                          <span className="font-medium">
                            {formatDate(application.withdrawnAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {application.rejectionReason && (
                    <div className="border-l-2 border-destructive/40 bg-destructive/5 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                        Reason given for rejection
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground">
                        {application.rejectionReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      <ConfirmationDialog
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        onConfirm={handlePutUnderReview}
        isLoading={actionLoading}
        title="Mark as Under Review"
        message="This marks the application as actively being considered, and is the step that unlocks accepting or rejecting it. The candidate will see the new status."
        confirmLabel="Yes, Mark as Under Review"
        cancelLabel="Cancel"
      />

      <DecisionDialog
        decision={pendingDecision}
        candidateName={application?.candidateName || "this candidate"}
        onClose={() => setPendingDecision(null)}
        onConfirm={handleDecision}
        isLoading={actionLoading}
      />

      <Footer />
    </div>
  )
}
