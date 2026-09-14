/**
 * The recommendation algorithm.
 *
 * Content-based filtering with a linear weighted utility function. Collaborative
 * filtering is not usable here: it needs interaction history across many users,
 * and a new platform has none — every user is a cold start. Content-based
 * ranking only needs the item text and what the user said they want, both of
 * which exist from the first day.
 *
 *     score(u, j) = Σ  w_i · f_i(u, j)
 *
 * Every feature f_i returns a value in [0, 1] and the weights sum to 1, so the
 * score is itself in [0, 1] and each weight reads directly as "how much this
 * signal is worth". That is what makes the method writable as a formula and
 * arguable as a design choice, rather than a black box.
 *
 * These functions are pure and take no Prisma types on purpose: the service
 * fetches, this file decides, and the decision can be tested with hand-built
 * objects and no database.
 */

/** How much each signal contributes. Must sum to 1 for `score` to stay in [0, 1]. */
export const SCORING_WEIGHTS = {
    /** Desired-title terms found in the job title — the strongest signal a user gives us. */
    titleMatch: 0.5,
    /** The same terms found in the body text: real, but weaker than a title hit. */
    textMatch: 0.2,
    /** Preferred location against the job's location or the company's city/district. */
    locationMatch: 0.25,
    /** A nudge toward fresher postings, only enough to break ties. */
    recency: 0.05,
} as const;

/** Postings older than this get no recency credit at all. */
const RECENCY_WINDOW_DAYS = 30;

/**
 * Words carrying no matching value. Kept deliberately short — an aggressive
 * stopword list would strip meaningful terms from a two-word job title.
 */
const STOPWORDS = new Set([
    "and", "or", "the", "for", "with", "job", "jobs", "role", "position",
    "va", "hoac", "viec", "lam", "tuyen", "dung",
]);

export interface ScorableJob {
    title: string;
    description: string;
    requirement: string;
    location: string;
    createdAt: Date;
    company: {
        name: string;
        city: string;
        district: string | null;
    };
}

export interface SeekerPreference {
    desiredJobTitle: string | null;
    preferredLocation: string | null;
}

export interface ScoredJob {
    score: number;
    reasons: string[];
}

/**
 * Split free text into comparable terms.
 *
 * Both sides of every comparison go through this, so "Back-End Engineer" and
 * "backend engineer" meet in the middle. Single characters are dropped because
 * they match almost everything.
 */
export function tokenize(value: string): string[] {
    return value
        .toLowerCase()
        .split(/[^a-z0-9À-ỹ]+/i)
        .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** What fraction of `terms` appear anywhere in `haystack`. */
function overlap(terms: string[], haystack: string): number {
    if (terms.length === 0) return 0;

    const text = haystack.toLowerCase();
    const hits = terms.filter((term) => text.includes(term)).length;
    return hits / terms.length;
}

/** 1 for a posting published today, decaying to 0 across the recency window. */
function recencyScore(createdAt: Date, now: Date): number {
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays <= 0) return 1;
    if (ageInDays >= RECENCY_WINDOW_DAYS) return 0;
    return 1 - ageInDays / RECENCY_WINDOW_DAYS;
}

/**
 * Score one job against one user's stated preferences, and say why.
 *
 * `reasons` is built from the same comparisons that produce the score, so the
 * explanation shown to the user cannot drift away from the ranking that put the
 * job there. A recommender that cannot answer "why this job?" is not defensible.
 *
 * **An empty `reasons` means the job is not a recommendation at all.** The
 * caller filters on that rather than on `score > 0`, because the recency term
 * gives every job a small non-zero score — ranking by it alone would just be
 * "newest first" wearing a recommender's clothes.
 */
export function scoreJob(
    job: ScorableJob,
    preference: SeekerPreference,
    now: Date = new Date()
): ScoredJob {
    const reasons: string[] = [];
    let score = 0;

    const desiredTitle = preference.desiredJobTitle?.trim() ?? "";
    const preferredLocation = preference.preferredLocation?.trim() ?? "";

    // 1. Desired title against the job title.
    const titleTerms = tokenize(desiredTitle);
    const titleOverlap = overlap(titleTerms, job.title);
    if (titleOverlap > 0) {
        score += SCORING_WEIGHTS.titleMatch * titleOverlap;
        reasons.push(`Matches your desired role: "${desiredTitle}"`);
    }

    // 2. The same terms against the body text. Scored separately and lower,
    //    because a word buried in a requirements list means less than the title.
    const bodyOverlap = overlap(titleTerms, `${job.description} ${job.requirement}`);
    if (bodyOverlap > 0) {
        score += SCORING_WEIGHTS.textMatch * bodyOverlap;
        if (titleOverlap === 0) {
            reasons.push(`Mentions "${desiredTitle}" in the job description`);
        }
    }

    // 3. Preferred location, against the posting's own location and — separately
    //    — the company's. The two are scored the same but explained
    //    differently: a remote posting from a Ho Chi Minh City company is a
    //    fair match, but telling the user it is "in your preferred location"
    //    would be untrue, and a wrong reason is worse than no reason.
    const locationTerms = tokenize(preferredLocation);
    const jobLocationOverlap = overlap(locationTerms, job.location);
    const companyLocationOverlap = overlap(
        locationTerms,
        `${job.company.city} ${job.company.district ?? ""}`
    );
    const locationOverlap = Math.max(jobLocationOverlap, companyLocationOverlap);

    if (locationOverlap > 0) {
        score += SCORING_WEIGHTS.locationMatch * locationOverlap;
        reasons.push(
            jobLocationOverlap > 0
                ? `In your preferred location: ${preferredLocation}`
                : `${job.company.name} is based in ${job.company.city}`
        );
    }

    // 4. Freshness, as a tie-breaker only. Deliberately not a reason: "posted
    //    recently" explains nothing about why this job suits this person.
    score += SCORING_WEIGHTS.recency * recencyScore(job.createdAt, now);

    return { score, reasons };
}
