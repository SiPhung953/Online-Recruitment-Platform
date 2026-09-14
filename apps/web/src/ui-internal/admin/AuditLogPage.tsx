import { useEffect, useState } from "react"
import { ClockCounterClockwise } from "@phosphor-icons/react"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import EmptyState from "@/ui-shared/components/EmptyState"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import { getAuditLogs } from "@/client"
import type { AuditLogListItemDto, LogLevel } from "@/client/types.gen"
import { formatDate } from "@/ui-shared/format/DateFormat"

function LevelBadge({ level }: { level: LogLevel }) {
  const getStyles = (level: LogLevel) => {
    switch (level) {
      case "INFO":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
      case "WARN":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600"
      case "ERROR":
        return "bg-red-500/10 border-red-500/30 text-red-600"
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-600"
    }
  }

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStyles(level)}`}
    >
      {level}
    </span>
  )
}

function formatAction(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}

function TargetRef({ item }: { item: AuditLogListItemDto }) {
  if (item.targetType === "SYSTEM" || !item.targetId) {
    return <span className="text-muted-foreground">{item.targetType}</span>
  }
  return (
    <span className="text-muted-foreground">
      {item.targetType} · {item.targetId}
    </span>
  )
}

function ActorRef({ item }: { item: AuditLogListItemDto }) {
  return (
    <span className="text-muted-foreground">
      {item.actorId ? `by ${item.actorId}` : "system"}
    </span>
  )
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getAuditLogs({ throwOnError: true })
        setLogs(res.data?.items ?? [])
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load logs. Please try again later."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
          Audit Logs
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          System events recorded for monitoring and incident review, newest
          first. Filters and per-event detail are planned as a future extension.
        </p>
      </div>

      {error && <ErrorAlert title="Logs Error" message={error} />}

      {loading ? (
        <Card className="border border-foreground/10 bg-card shadow-sm">
          <CardContent className="py-12">
            <LoadingSpinner message="Loading logs..." />
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ClockCounterClockwise size={40} />}
          title="No Logs Yet"
          description="Audit events will appear here as they occur across the platform."
        />
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.logId}
              className="border border-foreground/10 bg-card p-4 transition-colors hover:border-brand/40"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {formatAction(log.action)}
                  </span>
                  <LevelBadge level={log.level} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {formatDate(log.createdAt)}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                {log.message}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-wider">
                <TargetRef item={log} />
                <ActorRef item={log} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}