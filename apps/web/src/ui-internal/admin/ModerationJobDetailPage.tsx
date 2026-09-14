import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle, X, Trash } from "@phosphor-icons/react"
import { Button } from "@/ui-shared/components/ui/button"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import { Separator } from "@/ui-shared/components/ui/separator"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import ConfirmationDialog from "@/ui-shared/components/ConfirmationDialog"
import JobStatusBadge from "@/ui-external/employer-job-management/components/JobStatusBadge"
import {
  getModerationJobDetail,
  approveJobPosting,
  rejectJobPosting,
  removeJobPosting,
} from "@/client"
import type { ModerationJobDetailResponse } from "@/client/types.gen"
import { formatDate, formatDeadline } from "@/ui-shared/format/DateFormat"
import { formatEmploymentType } from "@/ui-shared/format/EmploymentTypeFormat"
import RejectJobDialog from "./components/RejectJobDialog"
import DeleteJobDialog from "./components/DeleteJobDialog"

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function ModerationJobDetailPage() {
  const { jobId = "" } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState<ModerationJobDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchJob = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getModerationJobDetail({ path: { jobId }, throwOnError: true })
      setJob(res.data ?? null)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load the job posting. Please try again later."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJob()
  }, [jobId])

  const handleApprove = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await approveJobPosting({ path: { jobId }, throwOnError: true })
      setSuccessMessage(res.data?.message ?? "Job posting approved successfully.")
      setShowApproveDialog(false)
      await fetchJob()
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to approve the job posting. Please try again."
      )
      setShowApproveDialog(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (rejectionReason: string) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await rejectJobPosting({
        path: { jobId },
        body: { rejectionReason },
        throwOnError: true,
      })
      setSuccessMessage(res.data?.message ?? "Job posting rejected successfully.")
      setShowRejectDialog(false)
      await fetchJob()
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to reject the job posting. Please try again."
      )
      setShowRejectDialog(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemove = async (deletionReason: string) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await removeJobPosting({
        path: { jobId },
        body: { deletionReason },
        throwOnError: true,
      })
      setSuccessMessage(res.data?.message ?? "Job posting deleted successfully.")
      setShowDeleteDialog(false)
      await fetchJob()
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to delete the job posting. Please try again."
      )
      setShowDeleteDialog(false)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="border border-foreground/10 bg-card shadow-sm">
          <CardContent className="py-12">
            <LoadingSpinner message="Loading job posting..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorAlert title="Moderation Error" message={error || "Job posting not found."} />
      </div>
    )
  }

  const isPending = job.status === "PENDING_APPROVAL"
  const canDelete =
    job.status !== "PENDING_APPROVAL" &&
    job.status !== "DELETED"

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate("/admin/jobs")}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand cursor-pointer"
      >
        <ArrowLeft size={13} />
        Back to Moderation List
      </button>

      {successMessage && (
        <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle size={16} weight="fill" className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && <ErrorAlert title="Moderation Error" message={error} />}

      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
              {job.title}
            </h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-xs font-medium text-muted-foreground">{job.companyName}</p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {isPending && (
            <>
              <Button
                onClick={() => setShowApproveDialog(true)}
                className="h-9 gap-2 rounded-none bg-brand px-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-brand/90"
              >
                <CheckCircle size={14} weight="fill" />
                Approve
              </Button>
              <Button
                onClick={() => setShowRejectDialog(true)}
                variant="destructive"
                className="h-9 gap-2 rounded-none px-4 text-[11px] font-bold uppercase tracking-wider"
              >
                <X size={14} weight="bold" />
                Reject
              </Button>
            </>
          )}

          {canDelete && (
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              className="h-9 gap-2 rounded-none px-4 text-[11px] font-bold uppercase tracking-wider"
            >
              <Trash size={14} />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Job content */}
      <Card className="border border-foreground/10 bg-card shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
              {job.description}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Requirements
            </h2>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
              {job.requirement}
            </p>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            <MetaRow
              label="Employment Type"
              value={formatEmploymentType(job.employmentType)}
            />
            <MetaRow label="Location" value={job.location || "—"} />
            <MetaRow label="Deadline" value={formatDeadline(job.deadline)} />
            <MetaRow label="Posted" value={formatDate(job.createdAt)} />
            <MetaRow label="Last Updated" value={formatDate(job.updatedAt)} />
            {job.approvedAt && <MetaRow label="Approved" value={formatDate(job.approvedAt)} />}
            {job.rejectedAt && <MetaRow label="Rejected" value={formatDate(job.rejectedAt)} />}
            {job.deletedAt && <MetaRow label="Deleted" value={formatDate(job.deletedAt)} />}
          </div>

          {job.rejectionReason && (
            <div className="border-l-2 border-red-500/40 bg-red-500/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                Rejection Reason
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">
                {job.rejectionReason}
              </p>
            </div>
          )}

          {job.deletionReason && (
            <div className="border-l-2 border-gray-500/40 bg-gray-500/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Deletion Reason
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">
                {job.deletionReason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onConfirm={handleApprove}
        title="Approve Job Posting"
        message="This job posting will go public immediately and appears in candidate search results. Continue?"
        confirmLabel="Yes, Approve"
        isLoading={actionLoading}
      />

      <RejectJobDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
        isLoading={actionLoading}
      />

      <DeleteJobDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleRemove}
        isLoading={actionLoading}
      />
    </div>
  )
}