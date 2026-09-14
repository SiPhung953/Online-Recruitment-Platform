import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Users, MagnifyingGlass, ArrowRight } from "@phosphor-icons/react"
import { Button } from "@/ui-shared/components/ui/button"
import { Input } from "@/ui-shared/components/ui/input"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import EmptyState from "@/ui-shared/components/EmptyState"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import UserStatusBadge from "./components/UserStatusBadge"
import { getUsers } from "@/client"
import type { UserListItemDto } from "@/client/types.gen"
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

export default function UserManagementPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialEmail = searchParams.get("email") ?? ""

  const [users, setUsers] = useState<UserListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(initialEmail)

  const fetchUsers = async (email: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getUsers({
        query: email ? { email } : undefined,
        throwOnError: true,
      })
      setUsers(res.data?.items ?? [])
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load users. Please try again later."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(initialEmail)
  }, [initialEmail])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams(searchInput.trim() ? { email: searchInput.trim() } : {})
  }

  const searched = initialEmail.length > 0

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
          Users
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          View accounts and account statuses. These tools are for administration
          purposes only — private data is not shown.
        </p>
      </div>

      {/* Email search */}
      <form onSubmit={handleSearch} className="flex max-w-md items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by email"
          className="h-9 rounded-none border-foreground/20 text-xs"
        />
        <Button
          type="submit"
          className="h-9 shrink-0 gap-2 rounded-none bg-brand px-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-brand/90"
        >
          <MagnifyingGlass size={13} weight="bold" />
          Search
        </Button>
        {searched && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchInput("")
              setSearchParams({})
            }}
            className="h-9 shrink-0 rounded-none text-[11px] font-bold uppercase tracking-wider cursor-pointer"
          >
            Clear
          </Button>
        )}
      </form>

      {error && <ErrorAlert title="Users Error" message={error} />}

      {loading ? (
        <Card className="border border-foreground/10 bg-card shadow-sm">
          <CardContent className="py-12">
            <LoadingSpinner message="Loading users..." />
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title={searched ? "User Not Found" : "No Users Found"}
          description={
            searched
              ? `No user matches "${initialEmail}". Check the email and try again.`
              : "There are no users in the system yet."
          }
        />
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <button
              key={user.userId}
              onClick={() => navigate(`/admin/users/${user.userId}`)}
              className="group w-full border border-foreground/10 bg-card p-5 text-left transition-all duration-200 hover:border-brand/40 hover:shadow-sm cursor-pointer"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-bold tracking-tight text-foreground">
                      {user.email}
                    </h3>
                    <UserStatusBadge status={user.status} />
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {user.fullName || "—"} · {getRoleLabel(user.roleId)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-5 text-[11px] font-medium text-muted-foreground">
                  <span>Joined {formatDate(user.createdAt)}</span>
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