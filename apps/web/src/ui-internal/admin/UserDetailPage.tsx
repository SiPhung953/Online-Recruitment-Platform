import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle,
  Prohibit,
  LockKeyOpen,
  User,
} from "@phosphor-icons/react"
import { Button } from "@/ui-shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui-shared/components/ui/card"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import ConfirmationDialog from "@/ui-shared/components/ConfirmationDialog"
import UserStatusBadge from "./components/UserStatusBadge"
import { getUserDetail, banUser, unbanUser } from "@/client"
import type { UserDetailResponse } from "@/client/types.gen"
import { RoleConstant } from "@/ui-shared/auth/RoleConstant"
import { formatDate } from "@/ui-shared/format/DateFormat"

function getRoleLabel(roleId: number) {
  switch (roleId) {
    case RoleConstant.JOB_SEEKER:
      return "Job Seeker"
    case RoleConstant.EMPLOYER:
      return "Employer"
    case RoleConstant.ADMIN:
      return "Admin"
    default:
      return `Role ${roleId}`
  }
}

function formatProfileVisibility(value: UserDetailResponse["profileVisibility"]) {
  switch (value) {
    case "VISIBLE_TO_EMPLOYERS":
      return "Visible to Employers"
    case "PRIVATE":
      return "Private"
    default:
      return value
  }
}

function formatJobSearchStatus(value: UserDetailResponse["jobSearchStatus"]) {
  switch (value) {
    case "OPEN_TO_WORK":
      return "Open to Work"
    case "NOT_LOOKING":
      return "Not Looking"
    default:
      return value
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right font-medium text-foreground break-words">{value}</span>
    </div>
  )
}

const textOrDash = (value: string | null) => value ?? "—"

export default function UserDetailPage() {
  const { userId = "" } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState<UserDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showBanDialog, setShowBanDialog] = useState(false)
  const [showUnbanDialog, setShowUnbanDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getUserDetail({ path: { userId }, throwOnError: true })
      setUser(res.data ?? null)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load the user. Please try again later."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [userId])

  const handleBan = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await banUser({ path: { userId }, throwOnError: true })
      setSuccessMessage(res.data?.message ?? "Account banned successfully.")
      setShowBanDialog(false)
      await fetchUser()
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to ban the account. Please try again."
      )
      setShowBanDialog(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await unbanUser({ path: { userId }, throwOnError: true })
      setSuccessMessage(res.data?.message ?? "Account unbanned successfully.")
      setShowUnbanDialog(false)
      await fetchUser()
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to unban the account. Please try again."
      )
      setShowUnbanDialog(false)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="border border-foreground/10 bg-card shadow-sm">
          <CardContent className="py-12">
            <LoadingSpinner message="Loading user..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorAlert title="Users Error" message={error || "User not found."} />
      </div>
    )
  }

  const isBanned = user.status === "BANNED"

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate("/admin/users")}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand cursor-pointer"
      >
        <ArrowLeft size={13} />
        Back to Users
      </button>

      {successMessage && (
        <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle size={16} weight="fill" className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && <ErrorAlert title="Users Error" message={error} />}

      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
            {user.email}
          </h1>
          <UserStatusBadge status={user.status} />
        </div>

        {isBanned ? (
          <Button
            onClick={() => setShowUnbanDialog(true)}
            className="h-9 gap-2 rounded-none px-4 text-[11px] font-bold uppercase tracking-wider"
          >
            <LockKeyOpen size={14} weight="bold" />
            Unban Account
          </Button>
        ) : (
          <Button
            onClick={() => setShowBanDialog(true)}
            variant="destructive"
            className="h-9 gap-2 rounded-none px-4 text-[11px] font-bold uppercase tracking-wider"
          >
            <Prohibit size={14} weight="bold" />
            Ban Account
          </Button>
        )}
      </div>

      {/* Account card */}
      <Card className="border border-foreground/10 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-foreground/10 px-6 py-4">
          <User size={14} className="text-brand" />
          <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-foreground">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Role" value={getRoleLabel(user.roleId)} />
            <InfoRow label="Status" value={isBanned ? "Banned" : "Active"} />
            <InfoRow label="Created" value={formatDate(user.createdAt)} />
          </div>
        </CardContent>
      </Card>

      {/* Profile card */}
      <Card className="border border-foreground/10 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-foreground/10 px-6 py-4">
          <User size={14} className="text-brand" />
          <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-foreground">
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            <InfoRow label="Full Name" value={textOrDash(user.fullName)} />
            <InfoRow label="Phone" value={textOrDash(user.phoneNumber)} />
            <InfoRow label="Avatar URL" value={textOrDash(user.avatarUrl)} />
            <InfoRow label="Headline" value={textOrDash(user.headline)} />
            <InfoRow
              label="Profile Visibility"
              value={formatProfileVisibility(user.profileVisibility)}
            />
            <InfoRow
              label="Job Search Status"
              value={formatJobSearchStatus(user.jobSearchStatus)}
            />
            <InfoRow label="Desired Title" value={textOrDash(user.desiredJobTitle)} />
            <InfoRow label="Preferred Location" value={textOrDash(user.preferredLocation)} />
            <InfoRow
              label="Profile Updated"
              value={textOrDash(user.profileUpdatedAt ? formatDate(user.profileUpdatedAt) : null)}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={showBanDialog}
        onClose={() => setShowBanDialog(false)}
        onConfirm={handleBan}
        title="Ban Account"
        message={`Ban "${user.email}"? This locks the account immediately: the user can no longer sign in, apply, upload a CV, update their profile, or manage job postings. Their data is kept.`}
        confirmLabel="Yes, Ban"
        isDestructive
        isLoading={actionLoading}
      />

      <ConfirmationDialog
        isOpen={showUnbanDialog}
        onClose={() => setShowUnbanDialog(false)}
        onConfirm={handleUnban}
        title="Unban Account"
        message={`Unban "${user.email}"? Access is restored immediately.`}
        confirmLabel="Yes, Unban"
        isLoading={actionLoading}
      />
    </div>
  )
}