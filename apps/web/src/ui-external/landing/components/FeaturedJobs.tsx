import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/ui-shared/components/ui/card"
import { Badge } from "@/ui-shared/components/ui/badge"
import { Button } from "@/ui-shared/components/ui/button"
import { MapPin, ArrowRight, Briefcase } from "@phosphor-icons/react"
import { searchJobs } from "@/client"
import type { JobListItemDto, EmploymentType } from "@/client/types.gen"
import ErrorAlert from "@/ui-shared/components/ErrorAlert"
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner"
import { formatEmploymentType } from "@/ui-shared/format/EmploymentTypeFormat"
import { companyInitial } from "@/ui-shared/format/CompanyInitial"

type TabValue = "ALL" | EmploymentType

// The old tabs (Internship / Research / Full-time / Co-op) had no column behind
// them. Employment type is the only categorisation the schema actually stores.
const TABS: { value: TabValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ON_SITE", label: "On Site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
]

interface FeaturedJobsProps {
  searchKeyword: string
  searchLocation: string
  onResetSearch: () => void
}

export default function FeaturedJobs({ searchKeyword, searchLocation, onResetSearch }: FeaturedJobsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("ALL")
  const [jobs, setJobs] = useState<JobListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keyword and location are the server's job — it matches them against the job
  // title, the company name, and the company's city/district, which the browser
  // cannot do against a page of results. The tab filter stays local because
  // employment type is already on every row.
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await searchJobs({
          query: {
            keyword: searchKeyword.trim() || undefined,
            location: searchLocation.trim() || undefined,
          },
          throwOnError: true,
        })
        setJobs(res.data?.items ?? [])
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load job postings. Please try again later."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [searchKeyword, searchLocation])

  const visibleJobs = useMemo(
    () => (activeTab === "ALL" ? jobs : jobs.filter((job) => job.employmentType === activeTab)),
    [jobs, activeTab]
  )

  return (
    <section className="bg-background py-20 font-sans" id="search-jobs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 text-center md:text-left md:flex md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Discover Opportunities
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Explore curated positions matching your field of study. Instantly connect with verified university partners.
            </p>
          </div>
        </div>

        {/* Tab Filters and Active Search Info */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-foreground/10 pb-4">
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
                  activeTab === tab.value
                    ? "bg-brand text-white border-brand"
                    : "bg-secondary/40 text-foreground/75 hover:bg-secondary border-transparent hover:border-foreground/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(searchKeyword || searchLocation) && (
            <div className="flex items-center gap-2 bg-brand/5 border border-brand/20 px-3 py-1.5 text-xs text-brand font-medium">
              <span>
                Filtering by: {searchKeyword ? `"${searchKeyword}"` : ""}
                {searchKeyword && searchLocation ? " in " : ""}
                {searchLocation ? `"${searchLocation}"` : ""}
              </span>
              <button
                onClick={onResetSearch}
                className="underline font-bold hover:text-brand/80 cursor-pointer ml-1"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {error && <ErrorAlert title="Could Not Load Jobs" message={error} className="mb-6" />}

        {/* Jobs Grid */}
        {loading ? (
          <LoadingSpinner message="Loading opportunities..." />
        ) : visibleJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleJobs.map((job) => (
              <Card
                key={job.id}
                className="border border-foreground/10 hover:border-brand/40 bg-card hover:shadow-md transition-all duration-300 flex flex-col relative group"
              >
                {/* Accent line on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-brand transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                <CardHeader className="flex flex-row items-start gap-4 pb-4">
                  {/* Company initial, since no logo is stored */}
                  <div className="size-12 flex items-center justify-center bg-brand text-white text-lg font-bold shrink-0">
                    {companyInitial(job.company.name)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-sm font-bold text-foreground group-hover:text-brand transition-colors line-clamp-1">
                      <Link to={`/jobs/${job.id}`} className="hover:underline">
                        {job.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-foreground/80">
                      <Link to={`/companies/${job.company.id}`} className="text-brand hover:underline">
                        {job.company.name}
                      </Link>
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  <div className="space-y-2 text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-foreground/40" />
                      <span>{job.location}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-foreground/10 bg-secondary/20 group-hover:bg-secondary/40 transition-colors flex justify-between items-center py-3">
                  <Badge className="bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-wider rounded-none px-2 py-0.5">
                    {formatEmploymentType(job.employmentType)}
                  </Badge>
                  <Link to={`/jobs/${job.id}`}>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs font-bold uppercase tracking-wider text-brand hover:text-brand/80 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight size={12} weight="bold" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-foreground/20 p-12 text-center max-w-md mx-auto">
            <Briefcase size={40} className="mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">No opportunities found</h3>
            <p className="text-xs text-muted-foreground mb-6">
              We couldn't find any matches for your query. Try broadening your keywords or clearing the search filters.
            </p>
            <Button
              onClick={onResetSearch}
              className="bg-brand hover:bg-brand/90 text-white uppercase tracking-wider text-xs font-bold"
            >
              Reset Search Filter
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
