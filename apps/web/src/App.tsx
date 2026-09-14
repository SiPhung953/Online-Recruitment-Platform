import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/ui-shared/auth/AuthContext"
import RequireAuth from "@/ui-shared/auth/RequireAuth"
import { LoginPage } from "@/ui-external/auth/LoginPage"
import ForgotPasswordPage from "@/ui-external/auth/ForgotPasswordPage"
import RegisterPage from "@/ui-external/auth/RegisterPage"
import ResetPasswordPage from "@/ui-external/auth/ResetPassword"
import LandingPage from "@/ui-external/landing/LandingPage"
import JobDetailPage from "@/ui-external/public/JobDetailPage"
import CompanyProfilePage from "@/ui-external/public/CompanyProfilePage"
import DashboardPage from "@/ui-external/dashboard/DashboardPage"
import ProfilePage from "@/ui-external/profile/ProfilePage"
import ApplyJobPage from "@/ui-external/applications/ApplyJobPage"
import MyApplicationsPage from "@/ui-external/applications/MyApplicationsPage"
import MyJobPostingsPage from "@/ui-external/employer-job-management/MyJobPostingsPage"
import MyCompanyPage from "@/ui-external/employer-company/MyCompanyPage"
import PostJobPage from "@/ui-external/employer-job-management/PostJobPage"
import { RoleConstant } from "@/ui-shared/auth/RoleConstant"

function AppRoutes() {
  const navigate = useNavigate()
  const { isLoggedIn, email, isEmployer, isAdmin, login } = useAuth()

  const handleLoginSuccess = (accessToken: string, userEmail: string, roleId: number) => {
    login(accessToken, userEmail, roleId)
    navigate(roleId === 2 ? "/employer/jobs" : "/dashboard")
  }

  return (
    <Routes>
      {/* ---------- Public ---------- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/jobs/:jobId" element={<JobDetailPage />} />
      <Route path="/companies/:companyId" element={<CompanyProfilePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ---------- Guest only ---------- */}
      <Route
        path="/register"
        element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to={isEmployer ? "/employer/jobs" : "/dashboard"} replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      {/* ---------- Any logged-in user ---------- */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage userEmail={email} />} />
        <Route path="/profile" element={<ProfilePage userEmail={email} />} />
      </Route>

      {/* ---------- Job Seeker only ---------- */}
      <Route element={<RequireAuth role="JOB_SEEKER" />}>
        <Route path="/applications" element={<MyApplicationsPage />} />
        <Route path="/jobs/:jobId/apply" element={<ApplyJobPage />} />
      </Route>

      {/* ---------- Employer only ---------- */}
      <Route element={<RequireAuth role="EMPLOYER" />}>
        <Route path="/employer/company" element={<MyCompanyPage />} />
        <Route path="/employer/jobs" element={<MyJobPostingsPage />} />
        <Route path="/employer/jobs/new" element={<PostJobPage />} />
      </Route>

      {/* ---------- Admin (Back-Office Worker) only ---------- */}
      <Route element={<RequireAuth role="ADMIN" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/jobs" replace />} />
          <Route path="jobs" element={<ModerationJobsPage />} />
          <Route path="jobs/:jobId" element={<ModerationJobDetailPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="logs" element={<AuditLogPage />} />
        </Route>
      </Route>

      {/* ---------- Fallback ---------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
