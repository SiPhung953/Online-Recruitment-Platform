import { describe, expect, it } from "vitest";

import {
    SCORING_WEIGHTS,
    scoreJob,
    tokenize,
    type ScorableJob,
    type SeekerPreference,
} from "../../src/api-external/job-recommendation/RecommendationScoring";

/**
 * Unit tests for the recommendation algorithm.
 *
 * `scoreJob` is a pure function over plain objects, so these run with no
 * database, no HTTP and no fixtures — every input is visible in the test. That
 * is what makes this file quotable in the report: the table of inputs and
 * expected outputs *is* the evidence that the formula behaves as described.
 */

const NOW = new Date("2026-06-15T00:00:00.000Z");

function makeJob(overrides: Partial<ScorableJob> = {}): ScorableJob {
    return {
        title: "Backend Engineer",
        description: "Design REST APIs and model relational data.",
        requirement: "Comfortable with TypeScript and SQL.",
        location: "Ho Chi Minh City",
        createdAt: NOW,
        company: {
            name: "FPT Software",
            city: "Ho Chi Minh City",
            district: "District 9",
        },
        ...overrides,
    };
}

function preference(overrides: Partial<SeekerPreference> = {}): SeekerPreference {
    return { desiredJobTitle: null, preferredLocation: null, ...overrides };
}

describe("SCORING_WEIGHTS", () => {
    it("sums to exactly 1, so a score is always a fraction of a perfect match", () => {
        const total = Object.values(SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

        // Floating point: 0.5 + 0.2 + 0.25 + 0.05 does not land on 1 exactly.
        expect(total).toBeCloseTo(1, 10);
    });
});

describe("tokenize", () => {
    it("lowercases and splits on punctuation, so spelling variants meet in the middle", () => {
        expect(tokenize("Back-End Engineer")).toEqual(["back", "end", "engineer"]);
        expect(tokenize("backend engineer")).toEqual(["backend", "engineer"]);
    });

    it("drops stopwords and single characters", () => {
        expect(tokenize("Engineer for the R position")).toEqual(["engineer"]);
    });

    it("keeps Vietnamese words intact", () => {
        expect(tokenize("Kỹ sư phần mềm")).toEqual(["kỹ", "sư", "phần", "mềm"]);
    });

    it("returns nothing for empty or punctuation-only input", () => {
        expect(tokenize("")).toEqual([]);
        expect(tokenize("--- / ---")).toEqual([]);
    });
});

describe("scoreJob", () => {
    it("ranks a full title match above a partial one", () => {
        const wanted = preference({ desiredJobTitle: "Backend Engineer" });

        const exact = scoreJob(makeJob({ title: "Backend Engineer" }), wanted, NOW);
        const partial = scoreJob(makeJob({ title: "Frontend Engineer" }), wanted, NOW);

        expect(exact.score).toBeGreaterThan(partial.score);
    });

    it("gives a job matching on every signal a score at or near 1", () => {
        const result = scoreJob(
            makeJob({ title: "Backend Engineer", description: "Backend Engineer work.", requirement: "" }),
            preference({ desiredJobTitle: "Backend Engineer", preferredLocation: "Ho Chi Minh City" }),
            NOW
        );

        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.score).toBeGreaterThan(0.9);
    });

    it("never scores outside [0, 1]", () => {
        const result = scoreJob(
            makeJob(),
            preference({ desiredJobTitle: "Backend Engineer", preferredLocation: "Ho Chi Minh City" }),
            NOW
        );

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });

    /**
     * The invariant the whole feature rests on. Recency gives *every* posting a
     * small non-zero score, so a caller filtering on `score > 0` would return
     * the entire job table ordered by freshness and call it a recommendation.
     * Empty `reasons` is what actually means "not a match".
     */
    it("returns no reasons for a job that matches nothing, even though it still scores", () => {
        const result = scoreJob(
            makeJob({ title: "Business Analyst", description: "Gather requirements.", requirement: "Writing." }),
            preference({ desiredJobTitle: "Machine Learning", preferredLocation: "Hanoi" }),
            NOW
        );

        expect(result.reasons).toEqual([]);
        expect(result.score).toBeGreaterThan(0); // recency alone
    });

    it("returns no reasons when the user has stated no preferences", () => {
        const result = scoreJob(makeJob(), preference(), NOW);

        expect(result.reasons).toEqual([]);
    });

    it("explains a title match by quoting the desired role", () => {
        const result = scoreJob(
            makeJob({ title: "Backend Engineer" }),
            preference({ desiredJobTitle: "Backend Engineer" }),
            NOW
        );

        expect(result.reasons).toContain('Matches your desired role: "Backend Engineer"');
    });

    it("credits a match found only in the body text, and says so", () => {
        const result = scoreJob(
            makeJob({
                title: "Platform Developer",
                description: "You will work alongside our machine learning group.",
                requirement: "Python.",
            }),
            preference({ desiredJobTitle: "machine learning" }),
            NOW
        );

        expect(result.reasons).toContain('Mentions "machine learning" in the job description');
        expect(result.score).toBeGreaterThan(0);
    });

    /**
     * Regression test. A remote posting from a Ho Chi Minh City company used to
     * be labelled "In your preferred location: Ho Chi Minh City", which was
     * simply untrue — the job is remote. A wrong reason is worse than no reason,
     * because the explanation is the only thing making the ranking auditable.
     */
    it("distinguishes a job located in the preferred city from a company merely based there", () => {
        const inCity = scoreJob(
            makeJob({ title: "Data Analyst", location: "Ho Chi Minh City" }),
            preference({ preferredLocation: "Ho Chi Minh City" }),
            NOW
        );
        const remoteFromCity = scoreJob(
            makeJob({ title: "Data Analyst", location: "Remote (Vietnam)" }),
            preference({ preferredLocation: "Ho Chi Minh City" }),
            NOW
        );

        expect(inCity.reasons).toContain("In your preferred location: Ho Chi Minh City");
        expect(remoteFromCity.reasons).toContain("FPT Software is based in Ho Chi Minh City");
        expect(remoteFromCity.reasons).not.toContain("In your preferred location: Ho Chi Minh City");
    });

    it("breaks a tie between equally matching jobs in favour of the fresher posting", () => {
        const wanted = preference({ desiredJobTitle: "Backend Engineer" });

        const fresh = scoreJob(makeJob({ createdAt: NOW }), wanted, NOW);
        const old = scoreJob(
            makeJob({ createdAt: new Date("2026-06-01T00:00:00.000Z") }),
            wanted,
            NOW
        );

        expect(fresh.score).toBeGreaterThan(old.score);
        // ...but only as a tie-break: freshness is never offered as a reason.
        expect(fresh.reasons).toEqual(old.reasons);
    });

    it("gives no recency credit to a posting older than the window", () => {
        const wanted = preference({ desiredJobTitle: "Backend Engineer" });

        const atWindowEdge = scoreJob(
            makeJob({ createdAt: new Date("2026-05-16T00:00:00.000Z") }), // 30 days
            wanted,
            NOW
        );
        const wellPast = scoreJob(
            makeJob({ createdAt: new Date("2025-01-01T00:00:00.000Z") }),
            wanted,
            NOW
        );

        expect(atWindowEdge.score).toBeCloseTo(wellPast.score, 10);
    });
});
