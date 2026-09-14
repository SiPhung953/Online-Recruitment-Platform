import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { RoleConstant, type RoleName } from "./RoleConstant"
import { homePathFor } from "./HomePath"

interface RequireAuthProps {
  /** Restrict to one persona. Omit to allow any logged-in user. */
  role?: RoleName
}

/**
 * Route guard. Wrap routes in `<Route element={<RequireAuth />}>` and the
 * children render through `<Outlet />` only when the check passes.
 *
 * This decides what is *rendered*, not what the user is allowed to do — every
 * request is authorised again on the server. See README, "Client-side guards
 * are not access control".
 */
export default function RequireAuth({ role }: RequireAuthProps) {
  const { isLoggedIn, roleId } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (role && roleId !== RoleConstant[role]) {
    // Send them to their own home rather than a fixed page: /dashboard is the
    // Job Seeker's, and an employer landing there would only be bounced again.
    return <Navigate to={homePathFor(roleId)} replace />
  }

  return <Outlet />
}
