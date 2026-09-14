import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import Header from "@/ui-external/landing/components/Header"
import Footer from "@/ui-external/landing/components/Footer"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/ui-shared/components/ui/card"
import { Button } from "@/ui-shared/components/ui/button"
import { Separator } from "@/ui-shared/components/ui/separator"
import {
  Briefcase,
  MapPin,
  Buildings,
  ArrowLeft,
  CircleNotch,
  CheckCircle,
  FilePdf,
  Plus,
} from "@phosphor-icons/react"
import { getJobDetail, getMyResumes, applyJobs } from "@/client"
import type { ResumeDto, GetJobDetailResponse } from "@/client/types.gen"
import ResumeSelector from "./components/ResumeSelector"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import { formatEmploymentType } from "@/ui-shared/format/EmploymentTypeFormat"

export default function ApplyJobPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  // State
  const [job, setJob] = useState<GetJobDetailResponse | null>(null)
  const [resumes, setResumes] = useState<ResumeDto[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  
  // Statuses
  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login", { replace: true })
    }
  }, [navigate])

  // Fetch job and resumes
  useEffect(() => {
    if (!jobId) return

    const fetchData = async () => {
      setPageLoading(true)
      setError(null)
      try {
        // 1. Load job details. The endpoint serves only postings that are
        //    ACTIVE and inside their deadline, so a failure here means the job
        //    cannot be applied to — which is what the error state should say.
        const jobRes = await getJobDetail({ path: { jobId }, throwOnError: true })
        if (!jobRes.data) {
          throw new Error("Job opportunity not found.")
        }
        setJob(jobRes.data)

        // 2. Load resumes
        const resumeRes = await getMyResumes({ throwOnError: true })
        const resumeList = resumeRes.data?.resumes ?? []
        setResumes(resumeList)
        
        // Auto-select first resume if available
        if (resumeList.length > 0) {
          setSelectedResumeId(resumeList[0].id)
        }
      } catch (err: any) {
        setError(err.message || err?.response?.data?.message || "Failed to load page data. Please try again.")
      } finally {
        setPageLoading(false)
      }
    }

    fetchData()
  }, [jobId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobId || !selectedResumeId) return

    setSubmitting(true)
    setError(null)
    try {
      await applyJobs({
        body: {
          jobId,
          resumeId: selectedResumeId,
        },
        throwOnError: true,
      })
      setSuccess(true)
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message

      if (status === 409) {
        setError("You have already applied for this job. Duplicate applications are not allowed.")
      } else if (status === 401) {
        setError("Your session has expired. Please log in again.")
      } else if (status === 403) {
        setError("Only job seekers are authorized to apply for jobs.")
      } else {
        setError(msg || "Failed to submit your application. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
        <Header />
        <main className="flex-1 bg-secondary/35 flex items-center justify-center">
          <LoadingSpinner message="Loading application details..." />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      <Header />

      <main className="flex-1 bg-secondary/35 py-10">
        <div className="mx-auto max-w-xl px-4 sm:px-6 space-y-6">
          {/* Back Navigation */}
          <div>
            <Link
              to={jobId ? `/jobs/${jobId}` : "/"}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-brand transition-colors"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Back to Job Details</span>
            </Link>
          </div>

          {error && <ErrorAlert title="Application Error" message={error} />}

          {success ? (
            /* Success State */
            <Card className="border border-emerald-500/20 bg-card shadow-sm relative overflow-hidden text-center p-8">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div className="flex justify-center mb-4 text-emerald-600">
                <CheckCircle size={48} weight="fill" />
              </div>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground mb-2">
                Application Submitted!
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto mb-6">
                Your application for <span className="font-bold text-foreground">"{job?.title}"</span> has been successfully sent to <span className="font-bold text-foreground">{job?.company.name}</span>. The employer will review your profile and resume.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link to="/applications">
                  <Button className="w-full sm:w-auto h-10 px-6 text-xs font-bold uppercase tracking-wider bg-brand hover:bg-brand/90 text-white border-none cursor-pointer transition-colors">
                    View My Applications
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="w-full sm:w-auto h-10 px-6 text-xs font-bold uppercase tracking-wider border-foreground/20 hover:bg-secondary/40 transition-colors">
                    Browse More Jobs
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            /* Application Form */
            <form onSubmit={handleSubmit}>
              <Card className="border border-foreground/10 bg-card shadow-sm relative overflow-hidden">
                {/* Top Accent Strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-brand" />

                <CardHeader className="border-b border-foreground/10 pb-5">
                  <CardTitle className="text-sm font-bold tracking-tight text-foreground uppercase">
                    Submit Job Application
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Please review the position details and select a resume to apply.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Job Details Section */}
                  <div className="bg-secondary/45 p-4 border border-foreground/10 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      Applying For
                    </h4>
                    <div className="space-y-1">
                      <div className="text-sm font-black text-foreground">
                        {job?.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
                        <span className="text-brand font-bold flex items-center gap-1">
                          <Buildings size={14} />
                          {job?.company.name}
                        </span>
                        <span className="text-muted-foreground/30 font-bold">&middot;</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin size={14} />
                          {job?.location}
                        </span>
                        <span className="text-muted-foreground/30 font-bold">&middot;</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Briefcase size={14} />
                          {job && formatEmploymentType(job.employmentType)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-foreground/10" />

                  {/* Resume Selection Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Select your Resume <span className="text-destructive">*</span>
                      </h4>
                      <Link to="/profile" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-brand hover:underline">
                        <Plus size={10} weight="bold" />
                        <span>Manage Resumes</span>
                      </Link>
                    </div>

                    {resumes.length === 0 ? (
                      <div className="text-center p-6 border border-dashed border-foreground/15 py-8 space-y-3">
                        <FilePdf size={28} className="mx-auto text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">
                          You haven't uploaded any resumes yet.
                        </p>
                        <Link to="/profile">
                          <Button type="button" variant="outline" className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider border-foreground/20 hover:border-brand hover:text-brand transition-colors cursor-pointer">
                            Upload a Resume
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <ResumeSelector
                        resumes={resumes}
                        selectedId={selectedResumeId}
                        onChange={setSelectedResumeId}
                      />
                    )}
                  </div>

                  {/* Disclaimer/Submit Section */}
                  <div className="pt-4 border-t border-foreground/10 space-y-4">
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      By clicking submit, you authorize AcademiaConnect to share your selected resume and profile information with the employer posting this position.
                    </p>

                    <Button
                      type="submit"
                      disabled={submitting || !selectedResumeId}
                      className="w-full h-11 text-xs font-bold uppercase tracking-wider bg-brand hover:bg-brand/90 text-white border-none cursor-pointer transition-colors"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <CircleNotch className="animate-spin" size={14} />
                          Submitting Application…
                        </span>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
