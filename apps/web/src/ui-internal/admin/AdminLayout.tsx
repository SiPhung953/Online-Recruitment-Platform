import { NavLink, Outlet } from "react-router-dom"
import Header from "@/ui-external/landing/components/Header"
import { Briefcase, Users, ClockCounterClockwise, ArrowUUpLeft } from "@phosphor-icons/react"

const NAV_ITEMS = [
  { to: "/admin/jobs", label: "Job Moderation", icon: Briefcase },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/logs", label: "Audit Logs", icon: ClockCounterClockwise },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      <Header />

      <div className="flex flex-1">
        {/* Left sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col justify-between border-r border-foreground/10 bg-card md:flex">
          <nav className="space-y-1 py-6">
            <p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Administrator
            </p>
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}>
                {({ isActive }) => (
                  <span
                    className={`flex items-center gap-2.5 border-l-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-transparent text-foreground/70 hover:border-brand/30 hover:text-brand"
                    }`}
                  >
                    <Icon size={14} weight={isActive ? "fill" : "regular"} />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-foreground/10 py-4">
            <NavLink to="/">
              <span className="flex items-center gap-2.5 border-l-2 border-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 transition-colors hover:border-brand/30 hover:text-brand">
                <ArrowUUpLeft size={14} />
                Back to Site
              </span>
            </NavLink>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 bg-secondary/35">
          <Outlet />
        </main>
      </div>
    </div>
  )
}