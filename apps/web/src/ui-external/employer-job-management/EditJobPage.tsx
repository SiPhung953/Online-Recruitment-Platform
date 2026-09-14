import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Info } from "@phosphor-icons/react"
import Header from "@/ui-external/landing/components/Header"
import Footer from "@/ui-external/landing/components/Footer"
import { Card, CardContent } from "@/ui-shared/components/ui/card"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import { getMyJobDetail, updateJobPosting } from "@/client"
import JobPostingForm, { type JobPostingFormValues } from "./components/JobPostingForm"
import { toDeadlineIso, toDateInputValue, earliestDeadline } from "./deadline"
import { getAvailableActions } from "./jobActions"

export default function EditJobPage() {
  const { jobId = "" } = useParams()
  const navigate = useNavigate()

  // `null` until the posting has loaded, so the form is never rendered with
  // blank values that would flash over the employer's real text.
  const [values, setValues] = useState<JobPostingFormValues | null>(null)
  const [editable, setEditable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getMyJobDetail({ path: { jobId }, throwOnError: true })
        const job = res.data
        if (!job) return

        // The same rule the list page uses to decide whether to show an Edit
        // button. Reaching this page by URL has to hit the rule too.
        setEditable(getAvailableActions(job.status).includes("EDIT"))

        setValues({
          title: job.title,
          description: job.description,
          requirement: job.requirement,
          location: job.location,
          employmentType: job.employmentType,
          // The API stores an instant; the picker wants a calendar date.
          deadline: toDateInputValue(new Date(job.deadline)),
        })
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load this job posting. Please try again later."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId])

  const handleChange = (field: keyof JobPostingFormValues, value: string) => {
    setValues((prev) => (prev === null ? prev : { ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values) return

    setSubmitting(true)
    setError(null)

    try {
      await updateJobPosting({
        path: { jobId },
        body: {
          title: values.title.trim(),
          description: values.description.trim(),
          requirement: values.requirement.trim(),
          location: values.location.trim(),
          employmentType: values.employmentType,
          deadline: toDeadlineIso(values.deadline),
        },
        throwOnError: true,
      })

      // The update drops the posting back to PENDING_APPROVAL, which the
      // detail page shows as a badge — so land there rather than on the list.
      navigate(`/employer/jobs/${jobId}`)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to save your changes. Please try again."
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      <Header />

      <main className="flex-1 bg-secondary/35 py-10">
        <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(`/employer/jobs/${jobId}`)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand"
          >
            <ArrowLeft size={13} weight="bold" />
            Back to Job Posting
          </button>

          <div className="space-y-1.5">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
              Edit Job Posting
            </h1>
            <p className="text-xs text-muted-foreground">
              Changes are reviewed again before the posting goes back on the public site.
            </p>
          </div>

          {error && <ErrorAlert title="Could Not Save" message={error} />}

          {loading ? (
            <Card className="border border-foreground/10 bg-card shadow-sm">
              <CardContent className="py-12">
                <LoadingSpinner message="Loading job posting..." />
              </CardContent>
            </Card>
          ) : !editable ? (
            <ErrorAlert
              title="Editing Not Available"
              message="Expired and deleted postings are kept as a record and can no longer be edited."
            />
          ) : (
            values && (
              <>
                <div className="flex items-start gap-3 border border-brand/25 bg-brand/5 px-4 py-3">
                  <Info size={16} weight="fill" className="mt-0.5 shrink-0 text-brand" />
                  <p className="text-xs leading-relaxed text-foreground">
                    Saving returns this posting to{" "}
                    <strong className="font-bold">Pending Approval</strong> and clears the
                    previous moderation decision. It stays off the public site until a
                    Moderator approves it again.
                  </p>
                </div>

                <Card className="border border-foreground/10 bg-card shadow-sm">
                  <CardContent className="p-6">
                    <JobPostingForm
                      values={values}
                      onChange={handleChange}
                      onSubmit={handleSubmit}
                      submitting={submitting}
                      submitLabel="Save Changes"
                      minDeadline={earliestDeadline()}
                    />
                  </CardContent>
                </Card>
              </>
            )
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
