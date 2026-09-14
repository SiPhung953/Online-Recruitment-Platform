import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/ui-shared/components/ui/button";
import { Badge } from "@/ui-shared/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui-shared/components/ui/card";
import { Separator } from "@/ui-shared/components/ui/separator";
import Header from "@/ui-external/landing/components/Header";
import Footer from "@/ui-external/landing/components/Footer";
import {
  MapPin,
  CalendarBlank,
  ArrowLeft,
  Briefcase,
  WarningCircle,
  Buildings,
} from "@phosphor-icons/react";
import { getJobDetail } from "@/client";
import type { GetJobDetailResponse } from "@/client/types.gen";
import LoadingSpinner from "@/ui-shared/components/LoadingSpinner";
import { formatDeadline } from "@/ui-shared/format/DateFormat";
import { formatEmploymentType } from "@/ui-shared/format/EmploymentTypeFormat";
import { companyInitial } from "@/ui-shared/format/CompanyInitial";

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<GetJobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const fetchJob = async () => {
      setLoading(true);
      try {
        const res = await getJobDetail({ path: { jobId }, throwOnError: true });
        setJob(res.data ?? null);
      } catch {
        // The endpoint serves only postings that are ACTIVE and still inside
        // their deadline, so every failure here means the same thing to a
        // visitor: there is nothing to look at. One "not found" screen covers
        // a wrong id, a closed posting and an expired one alike.
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  useEffect(() => {
    document.title = job
      ? `${job.title} at ${job.company.name} | AcademiaConnect`
      : "Job Opportunity | AcademiaConnect";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading job posting..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <WarningCircle size={48} className="text-muted-foreground mb-4 opacity-75" />
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-foreground mb-2">
            Job Not Found
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            This posting is no longer accepting applications, or the link you followed is incorrect.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-brand hover:bg-brand/90 text-white uppercase tracking-wider text-xs font-bold px-6 h-10 border-none cursor-pointer"
          >
            Back to Job Search
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-brand/20 selection:text-brand flex flex-col">
      {/* Navigation Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 bg-secondary/10 py-10 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

          {/* Back Navigation Link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-brand transition-colors"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Back to search</span>
            </Link>
          </div>

          {/* Header Card */}
          <Card className="border border-foreground/10 bg-card mb-8 shadow-sm relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand" />
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

              {/* Job Info Left */}
              <div className="flex gap-4 items-start">
                <div className="size-14 md:size-16 flex items-center justify-center bg-brand text-white text-2xl font-bold shrink-0 shadow-inner">
                  {companyInitial(job.company.name)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                      {job.title}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs md:text-sm font-medium">
                    <Link
                      to={`/companies/${job.company.id}`}
                      className="text-brand hover:underline font-bold flex items-center gap-1"
                    >
                      <Buildings size={16} />
                      {job.company.name}
                    </Link>
                    <span className="text-muted-foreground/50">&middot;</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin size={16} />
                      {job.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                <div className="flex items-center justify-start md:justify-end">
                  <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 text-xs font-bold uppercase tracking-wider rounded-none px-2.5 py-0.5">
                    Accepting Applications
                  </Badge>
                </div>
                <Button
                  onClick={() => navigate(`/jobs/${jobId}/apply`)}
                  className="h-10 px-6 text-xs font-bold uppercase tracking-wider bg-brand hover:bg-brand/90 text-white border-none cursor-pointer rounded-none transition-colors"
                >
                  Apply Now
                </Button>
              </div>

            </div>
          </Card>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column - Detailed Description */}
            <div className="lg:col-span-2 space-y-6">

              {/* Job Description */}
              <Card className="border border-foreground/10 bg-card p-6 md:p-8 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
                  Job Description
                </h3>
                <div className="text-xs md:text-sm text-foreground/95 leading-relaxed space-y-4 font-normal whitespace-pre-wrap">
                  {job.description}
                </div>
              </Card>

              {/* Job Requirements */}
              <Card className="border border-foreground/10 bg-card p-6 md:p-8 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
                  Key Requirements
                </h3>
                <div className="text-xs md:text-sm text-foreground/95 leading-relaxed space-y-4 font-normal whitespace-pre-wrap">
                  {job.requirement}
                </div>
              </Card>

            </div>

            {/* Right Column - Sidebar Metadata */}
            <div className="space-y-6">

              {/* Metadata Card */}
              <Card className="border border-foreground/10 bg-card shadow-sm">
                <CardHeader className="border-b border-foreground/10 pb-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Briefcase size={16} className="text-brand" />
                    Position Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">

                  {/* Employment Type */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                      Employment Type
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Briefcase size={16} className="text-muted-foreground/60" />
                      {formatEmploymentType(job.employmentType)}
                    </span>
                  </div>

                  <Separator className="bg-foreground/10" />

                  {/* Location */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                      Location
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin size={16} className="text-muted-foreground/60" />
                      {job.location}
                    </span>
                  </div>

                  <Separator className="bg-foreground/10" />

                  {/* Deadline */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                      Application Deadline
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <CalendarBlank size={16} className="text-muted-foreground/60" />
                      {formatDeadline(job.deadline)}
                    </span>
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
  );
}
