import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../../src/app";
import { disconnectDatabase, resetDatabase } from "../setup/TestDatabase";
import { createEmployer, createJob, daysAgo, type TestEmployer } from "../setup/Fixtures";

/**
 * UC-PUB-01 (Search Jobs) and UC-PUB-02 (View Company Profiles).
 *
 * These run with no Authorization header at all: the point is what an
 * unauthenticated visitor can and cannot see. The negative cases matter more
 * than the positive one — a posting awaiting moderation or past its deadline
 * leaking into public search is the failure that would actually matter.
 */
describe("Public access", () => {
    let employer: TestEmployer;

    beforeEach(async () => {
        await resetDatabase();
        employer = await createEmployer();
    });

    afterAll(disconnectDatabase);

    describe("GET /jobs", () => {
        it("returns approved, open postings", async () => {
            await createJob(employer, { title: "Backend Engineer" });

            const response = await request(app).get("/jobs");

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].title).toBe("Backend Engineer");
        });

        it("hides a posting still awaiting moderation", async () => {
            await createJob(employer, { title: "Unapproved Role", status: "PENDING_APPROVAL" });

            const response = await request(app).get("/jobs");

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(0);
        });

        /**
         * The deadline is checked on every public read, so this holds the
         * instant a deadline lapses — before the expiry sweep has run and while
         * the stored status still says ACTIVE.
         */
        it("hides a posting whose deadline has passed, even while its status is still ACTIVE", async () => {
            await createJob(employer, {
                title: "Lapsed Role",
                status: "ACTIVE",
                deadline: daysAgo(1),
            });

            const response = await request(app).get("/jobs");

            expect(response.body.items).toHaveLength(0);
        });

        it("filters by keyword against the job title", async () => {
            await createJob(employer, { title: "Backend Engineer" });
            await createJob(employer, { title: "Business Analyst" });

            const response = await request(app).get("/jobs").query({ keyword: "Backend" });

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].title).toBe("Backend Engineer");
        });
    });

    describe("GET /jobs/{jobId}", () => {
        it("returns the detail of an open posting", async () => {
            const job = await createJob(employer, { title: "Backend Engineer" });

            const response = await request(app).get(`/jobs/${job.id}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(job.id);
            expect(response.body.company.name).toBe("Test Company");
        });

        it("404s for a posting past its deadline", async () => {
            const job = await createJob(employer, { deadline: daysAgo(1) });

            const response = await request(app).get(`/jobs/${job.id}`);

            expect(response.status).toBe(404);
        });

        it("404s for a posting awaiting moderation", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });

            const response = await request(app).get(`/jobs/${job.id}`);

            expect(response.status).toBe(404);
        });
    });

    describe("GET /companies/{companyId}", () => {
        it("returns the company with only its open postings", async () => {
            await createJob(employer, { title: "Backend Engineer" });
            await createJob(employer, { title: "Hidden Role", status: "PENDING_APPROVAL" });

            const response = await request(app).get(`/companies/${employer.companyId}`);

            expect(response.status).toBe(200);
            expect(response.body.company.name).toBe("Test Company");
            expect(response.body.jobs).toHaveLength(1);
        });
    });

    describe("protected routes", () => {
        it("401s without a token", async () => {
            const response = await request(app).get("/recommendations");

            expect(response.status).toBe(401);
        });

        it("401s on a malformed token", async () => {
            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", "Bearer not-a-real-token");

            expect(response.status).toBe(401);
        });
    });
});
