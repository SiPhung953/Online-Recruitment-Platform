import { RoleConstant } from "./RoleConstant"

/**
 * The page a user belongs on after logging in, and where a guard should send
 * them when they land on a page meant for a different persona.
 *
 * Each persona has its own home because the landing pages are not
 * interchangeable: `/dashboard` calls Job Seeker endpoints, `/employer/jobs`
 * calls Employer ones. Redirecting everybody to a single home would hand one
 * of them a page that 403s on its first request.
 */
export function homePathFor(roleId: number | null): string {
  switch (roleId) {
    case RoleConstant.ADMIN:
      return "/admin/jobs"
    case RoleConstant.EMPLOYER:
      return "/employer/jobs"
    case RoleConstant.JOB_SEEKER:
      return "/dashboard"
    default:
      return "/"
  }
}
