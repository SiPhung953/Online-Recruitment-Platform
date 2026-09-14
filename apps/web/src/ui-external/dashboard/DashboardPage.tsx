import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import Header from "@/ui-external/landing/components/Header"
import Footer from "@/ui-external/landing/components/Footer"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/ui-shared/components/ui/card"
import { Button } from "@/ui-shared/components/ui/button"
import {
  User,
  Briefcase,
  Eye,
  Download,
  ArrowRight,
  Sparkle
} from "@phosphor-icons/react"
import { getMyProfile, getMyApplications, getRecommendations } from "@/client"
import type { RecommendedJobDto, RecommendationBasis } from "@/client/types.gen"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import RecommendedJobCard from "./components/RecommendedJobCard"

/** What the section says about itself, per the basis the API reports. */
const BASIS_DESCRIPTION: Record<RecommendationBasis, string> = {
  PREFERENCES: "Ranked against the job preferences you saved.",
  LATEST: "The newest openings. Set your preferences to get tailored matches.",
  NOT_LOOKING: "Your job search status is set to Not Looking.",
}

interface DashboardPageProps {
  userEmail: string
}

export default function DashboardPage({ userEmail }: DashboardPageProps) {
  const [fullName, setFullName] = useState<string>("")
  const [appCount, setAppCount] = useState<number>(0)

  const [recommendations, setRecommendations] = useState<RecommendedJobDto[]>([])
  const [basis, setBasis] = useState<RecommendationBasis>("LATEST")
  const [recommendationsLoading, setRecommendationsLoading] = useState(true)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile({ throwOnError: true })
        if (res.data?.profile?.fullName) {
          setFullName(res.data.profile.fullName)
        }
      } catch (err) {
        // ignore
      }
    }
    const fetchApplications = async () => {
      try {
        const res = await getMyApplications({ throwOnError: true })
        if (res.data) {
          setAppCount(res.data.length)
        }
      } catch (err) {
        // ignore
      }
    }
    const fetchRecommendations = async () => {
      setRecommendationsLoading(true)
      setRecommendationsError(null)
      try {
        const res = await getRecommendations({ throwOnError: true })
        setRecommendations(res.data?.items ?? [])
        setBasis(res.data?.basis ?? "LATEST")
      } catch (err: any) {
        setRecommendationsError(
          err?.response?.data?.message ||
            "Could not load your recommendations. Please try again later."
        )
      } finally {
        setRecommendationsLoading(false)
      }
    }

    fetchProfile()
    fetchApplications()
    fetchRecommendations()
  }, [])

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      {/* Navigation Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 bg-secondary/35 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="relative overflow-hidden bg-card border border-foreground/10 p-6 md:p-8 mb-8 shadow-sm">
            {/* Accent corners */}
            <div className="absolute -top-1 -left-1 size-2 border-t border-l border-brand" />
            <div className="absolute -top-1 -right-1 size-2 border-t border-r border-brand" />
            <div className="absolute -bottom-1 -left-1 size-2 border-b border-l border-brand" />
            <div className="absolute -bottom-1 -right-1 size-2 border-b border-r border-brand" />
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-xs font-semibold text-brand uppercase tracking-wider">
                  <Sparkle size={12} weight="fill" />
                  <span>Student Dashboard</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                  Hello, <span className="text-brand">{fullName || userEmail.split('@')[0]}</span>
                </h1>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Your professional student profile is ready. Update your qualifications, preferences, and CVs to start matching with premium campus-focused career opportunities.
                </p>
              </div>
              <div>
                <Link to="/profile">
                  <Button className="h-10 px-5 text-xs font-bold uppercase tracking-wider bg-brand hover:bg-brand/90 text-white cursor-pointer transition-colors border-none">
                    <span className="flex items-center gap-1.5">
                      Manage Profile
                      <ArrowRight size={14} weight="bold" />
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Stats and Quick Actions (Span 2) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Link to="/applications" className="block hover:opacity-90 transition-all duration-200 cursor-pointer">
                  <Card className="border border-foreground/10 shadow-sm h-full">
                    <CardContent className="pt-5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Applications</p>
                        <h3 className="text-2xl font-black text-foreground mt-1">{appCount}</h3>
                      </div>
                      <div className="p-2.5 bg-secondary/50 text-foreground/75">
                        <Briefcase size={20} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Card className="border border-foreground/10 shadow-sm">
                  <CardContent className="pt-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Profile Views</p>
                      <h3 className="text-2xl font-black text-foreground mt-1">12</h3>
                    </div>
                    <div className="p-2.5 bg-secondary/50 text-brand">
                      <Eye size={20} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-foreground/10 shadow-sm">
                  <CardContent className="pt-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resume Downloads</p>
                      <h3 className="text-2xl font-black text-foreground mt-1">2</h3>
                    </div>
                    <div className="p-2.5 bg-secondary/50 text-foreground/75">
                      <Download size={20} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommended Jobs / Info */}
              <Card className="border border-foreground/10 shadow-sm">
                <CardHeader className="border-b border-foreground/10 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Recommended Opportunities</CardTitle>
                  <CardDescription>{BASIS_DESCRIPTION[basis]}</CardDescription>
                </CardHeader>
                <CardContent className={recommendations.length > 0 ? "pt-6" : "py-12 text-center"}>
                  {recommendationsLoading ? (
                    <LoadingSpinner message="Finding opportunities for you..." />
                  ) : recommendationsError ? (
                    <ErrorAlert title="Recommendations Unavailable" message={recommendationsError} />
                  ) : recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.map((job) => (
                        <RecommendedJobCard key={job.id} job={job} />
                      ))}
                    </div>
                  ) : (
                    <div className="mx-auto max-w-sm space-y-3">
                      <Briefcase size={36} className="mx-auto text-muted-foreground/50" />
                      <h4 className="text-sm font-bold text-foreground">
                        {basis === "NOT_LOOKING"
                          ? "Recommendations are paused"
                          : "No active recommendations"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {basis === "NOT_LOOKING"
                          ? "You have set your job search status to Not Looking. Change it to Open to Work to see matches again."
                          : "Tell us the role and location you are after, and matching openings will appear here."}
                      </p>
                      <div className="pt-2">
                        <Link to="/profile">
                          <Button variant="outline" className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider border-foreground/20 hover:border-brand hover:text-brand transition-colors cursor-pointer">
                            {basis === "NOT_LOOKING" ? "Update Status" : "Fill Preferences"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Profile Strength Card */}
            <div>
              <Card className="border border-foreground/10 shadow-sm">
                <CardHeader className="border-b border-foreground/10 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <User size={16} className="text-brand" />
                    Profile Completeness
                  </CardTitle>
                  <CardDescription>Increase your visibility score for employer search.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Strength Indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-muted-foreground">Completeness Score</span>
                      <span className="text-brand">40%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary">
                      <div className="h-full bg-brand" style={{ width: "40%" }} />
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Remaining Steps:</p>
                    
                    <div className="flex items-start gap-2.5 text-xs text-foreground/80">
                      <span className="flex size-4 shrink-0 items-center justify-center bg-secondary text-[10px] font-bold">1</span>
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">Upload your CV</p>
                        <p className="text-[11px] text-muted-foreground">Attach a PDF/DOCX resume for applications.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 text-xs text-foreground/80">
                      <span className="flex size-4 shrink-0 items-center justify-center bg-secondary text-[10px] font-bold">2</span>
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">Fill Professional Summary</p>
                        <p className="text-[11px] text-muted-foreground">Add a brief highlight of your achievements.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 text-xs text-foreground/80">
                      <span className="flex size-4 shrink-0 items-center justify-center bg-secondary text-[10px] font-bold">3</span>
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">Set Job Preferences</p>
                        <p className="text-[11px] text-muted-foreground">Indicate your search status and desired roles.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-foreground/10">
                    <Link to="/profile" className="flex items-center justify-between text-xs font-bold text-brand uppercase tracking-wider hover:underline">
                      <span>Complete Profile Now</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
