import { Badge } from "@/ui-shared/components/ui/badge"

export type UserStatus = "ACTIVE" | "BANNED"

interface UserStatusBadgeProps {
  status: UserStatus
  className?: string
}

export default function UserStatusBadge({ status, className = "" }: UserStatusBadgeProps) {
  const getStyles = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
      case "BANNED":
        return "bg-red-500/10 border-red-500/30 text-red-600 hover:bg-red-500/10"
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-600 hover:bg-gray-500/10"
    }
  }

  const getLabel = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE":
        return "Active"
      case "BANNED":
        return "Banned"
      default:
        return status
    }
  }

  return (
    <Badge
      className={`border rounded-none text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 shadow-none ${getStyles(status)} ${className}`}
    >
      {getLabel(status)}
    </Badge>
  )
}