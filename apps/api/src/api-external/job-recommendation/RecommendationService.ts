import { prisma } from '../../lib/prisma';
import { assertJobSeeker } from '../../api-shared/guard/AssertRole';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';

import { GetRecommendationsResponse } from './GetRecommendationsResponse';
import { RecommendedJobDto } from './RecommendedJobDto';
import { scoreJob } from './RecommendationScoring';

/** How many postings the dashboard section shows. */
const MAX_RECOMMENDATIONS = 6;

export class RecommendationService {
    public async getRecommendations(
        currentUser: CurrentUser
    ): Promise<GetRecommendationsResponse> {
        // 1. Check whether user is a Job Seeker
        assertJobSeeker(currentUser);

        // 2. Read the stated preferences. A row may not exist yet — the user
        //    only gets one once they save the preferences form.
        const preference = await prisma.userJobPreference.findUnique({
            where: { userId: currentUser.id },
            select: {
                jobSearchStatus: true,
                desiredJobTitle: true,
                preferredLocation: true,
            },
        });

        // 3. Honour an explicit "not looking". Recommending at someone who has
        //    just told us they are not searching would ignore their setting.
        if (preference?.jobSearchStatus === "NOT_LOOKING") {
            return { items: [], basis: "NOT_LOOKING" };
        }

        // 4. Exclude what they already applied to — a recommendation the user
        //    has acted on is noise, whatever it scores.
        const applications = await prisma.application.findMany({
            where: { userId: currentUser.id },
            select: { jobId: true },
        });
        const appliedJobIds = applications.map((application) => application.jobId);

        // 5. Candidates are the same set the public search exposes: approved,
        //    and not past the deadline whether or not the expiry sweep has run.
        const candidates = await prisma.job.findMany({
            where: {
                status: "ACTIVE",
                deadline: { gt: new Date() },
                id: { notIn: appliedJobIds },
            },
            select: {
                id: true,
                title: true,
                description: true,
                requirement: true,
                employmentType: true,
                location: true,
                createdAt: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        district: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // 6. With nothing stated, there is nothing to rank against. Show the
        //    newest postings and let the UI ask for preferences, rather than
        //    presenting an arbitrary order as if it were tailored.
        const hasPreferences = Boolean(
            preference?.desiredJobTitle?.trim() || preference?.preferredLocation?.trim()
        );

        if (!hasPreferences) {
            const items: RecommendedJobDto[] = candidates
                .slice(0, MAX_RECOMMENDATIONS)
                .map((job) => ({
                    id: job.id,
                    title: job.title,
                    employmentType: job.employmentType,
                    location: job.location,
                    company: { id: job.company.id, name: job.company.name },
                    score: 0,
                    reasons: [],
                }));

            return { items, basis: "LATEST" };
        }

        // 7. Score, keep only what can be explained, and rank.
        const scored = candidates
            .map((job) => ({
                job,
                ...scoreJob(job, {
                    desiredJobTitle: preference?.desiredJobTitle ?? null,
                    preferredLocation: preference?.preferredLocation ?? null,
                }),
            }))
            // An empty `reasons` means nothing actually matched; only the
            // recency term fired, which is not a reason to recommend anything.
            .filter((entry) => entry.reasons.length > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_RECOMMENDATIONS);

        const items: RecommendedJobDto[] = scored.map((entry) => ({
            id: entry.job.id,
            title: entry.job.title,
            employmentType: entry.job.employmentType,
            location: entry.job.location,
            company: { id: entry.job.company.id, name: entry.job.company.name },
            score: entry.score,
            reasons: entry.reasons,
        }));

        return { items, basis: "PREFERENCES" };
    }
}
