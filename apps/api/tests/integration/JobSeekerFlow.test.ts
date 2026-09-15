import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { disconnectDatabase, resetDatabase } from "../setup/TestDatabase";
import {
    createApplication,
    createEmployer,
    createJob,
    createJobSeeker,
    createResume,
    daysAgo,
    setJobPreference,
    type TestActor,
    type TestEmployer,
} from "../setup/Fixtures";

/**
 * UC-JS-01 (Apply), UC-JS-03 (Track), UC-JS-04 (Withdraw) and
 * UC-JS-05 (Recommendations).
 */
describe("Job Seeker", () => {
    let seeker: TestActor;
    let employer: TestEmployer;

    beforeEach(async () => {
        await resetDatabase();
        seeker = await createJobSeeker();
        employer = await createEmployer();
    });

    afterAll(disconnectDatabase);

    describe("POST /applications", () => {
        it("submits an application against a chosen CV", async () => {
            const job = await createJob(employer);
            const resume = await createResume(seeker);

            const response = await request(app)
                .post("/applications")
                .set("Authorization", seeker.authHeader)
                .send({ jobId: job.id, resumeId: resume.id });

            expect(response.status).toBe(201);

            const stored = await prisma.application.findFirst({
                where: { userId: seeker.id, jobId: job.id },
            });
            expect(stored?.status).toBe("SUBMITTED");
            expect(stored?.resumeId).toBe(resume.id);
        });

        it("refuses a second application to the same posting", async () => {
            const job = await createJob(employer);
            const resume = await createResume(seeker);
            await createApplication(seeker, job.id, resume.id);

            const response = await request(app)
                .post("/applications")
                .set("Authorization", seeker.authHeader)
                .send({ jobId: job.id, resumeId: resume.id });

            expect(response.status).toBe(409);
            expect(await prisma.application.count()).toBe(1);
        });

        it("refuses a posting past its deadline", async () => {
            const job = await createJob(employer, { deadline: daysAgo(1) });
            const resume = await createResume(seeker);

            const response = await request(app)
                .post("/applications")
                .set("Authorization", seeker.authHeader)
                .send({ jobId: job.id, resumeId: resume.id });

            expect(response.status).toBe(400);
        });

        it("refuses a posting that is not approved", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });
            const resume = await createResume(seeker);

            const response = await request(app)
                .post("/applications")
                .set("Authorization", seeker.authHeader)
                .send({ jobId: job.id, resumeId: resume.id });

            expect(response.status).toBe(400);
        });

        it("refuses a CV belonging to somebody else", async () => {
            const job = await createJob(employer);
            const otherSeeker = await createJobSeeker("other.seeker@test.local");
            const othersResume = await createResume(otherSeeker);

            const response = await request(app)
                .post("/applications")
                .set("Authorization", seeker.authHeader)
                .send({ jobId: job.id, resumeId: othersResume.id });

            expect(response.status).toBe(403);
        });
    });

    /**
     * Note the response shape: this endpoint returns a bare array, not the
     * `{ items }` envelope every other list endpoint in the API uses. The
     * tests assert what the endpoint actually does rather than what the
     * convention says it should, so they keep passing until somebody decides
     * to change the contract.
     */
    describe("GET /applications/my", () => {
        it("lists the seeker's own applications with the posting they target", async () => {
            const job = await createJob(employer, { title: "Backend Engineer" });
            const resume = await createResume(seeker);
            await createApplication(seeker, job.id, resume.id);

            const response = await request(app)
                .get("/applications/my")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].jobTitle).toBe("Backend Engineer");
            expect(response.body[0].companyName).toBe("Test Company");
            expect(response.body[0].status).toBe("SUBMITTED");
        });

        /**
         * UC-JS-03 keeps an application in the seeker's history even after the
         * posting it targets has lapsed, so the record of having applied does
         * not disappear when a deadline passes.
         */
        it("keeps an application visible after its posting has expired", async () => {
            const job = await createJob(employer, { deadline: daysAgo(1) });
            const resume = await createResume(seeker);
            await createApplication(seeker, job.id, resume.id);

            const response = await request(app)
                .get("/applications/my")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
        });

        it("never shows another seeker's applications", async () => {
            const job = await createJob(employer);
            const otherSeeker = await createJobSeeker("other.seeker@test.local");
            const othersResume = await createResume(otherSeeker);
            await createApplication(otherSeeker, job.id, othersResume.id);

            const response = await request(app)
                .get("/applications/my")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(0);
        });
    });

    describe("PATCH /applications/{id}/withdraw", () => {
        it("withdraws an application the seeker owns", async () => {
            const job = await createJob(employer);
            const resume = await createResume(seeker);
            const application = await createApplication(seeker, job.id, resume.id);

            const response = await request(app)
                .patch(`/applications/${application.id}/withdraw`)
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);

            const stored = await prisma.application.findUnique({ where: { id: application.id } });
            expect(stored?.status).toBe("WITHDRAWN");
            expect(stored?.withdrawnAt).not.toBeNull();
        });

        it("refuses to withdraw somebody else's application", async () => {
            const job = await createJob(employer);
            const otherSeeker = await createJobSeeker("other.seeker@test.local");
            const othersResume = await createResume(otherSeeker);
            const othersApplication = await createApplication(otherSeeker, job.id, othersResume.id);

            const response = await request(app)
                .patch(`/applications/${othersApplication.id}/withdraw`)
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(403);
        });

        it("refuses to withdraw twice", async () => {
            const job = await createJob(employer);
            const resume = await createResume(seeker);
            const application = await createApplication(seeker, job.id, resume.id);

            await request(app)
                .patch(`/applications/${application.id}/withdraw`)
                .set("Authorization", seeker.authHeader);

            const second = await request(app)
                .patch(`/applications/${application.id}/withdraw`)
                .set("Authorization", seeker.authHeader);

            expect(second.status).toBe(400);
        });
    });

    describe("GET /recommendations", () => {
        it("ranks against stated preferences and explains every result", async () => {
            await createJob(employer, { title: "Backend Engineer", location: "Ho Chi Minh City" });
            await createJob(employer, { title: "Business Analyst", location: "Hanoi" });
            await setJobPreference(seeker, {
                desiredJobTitle: "Backend Engineer",
                preferredLocation: "Ho Chi Minh City",
            });

            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);
            expect(response.body.basis).toBe("PREFERENCES");
            expect(response.body.items[0].title).toBe("Backend Engineer");

            // The contract the dashboard relies on: a recommendation the system
            // cannot explain is not shown at all.
            for (const item of response.body.items) {
                expect(item.reasons.length).toBeGreaterThan(0);
            }
        });

        it("never recommends a job the seeker has already applied to", async () => {
            const applied = await createJob(employer, { title: "Backend Engineer" });
            await createJob(employer, { title: "Backend Developer" });
            const resume = await createResume(seeker);
            await createApplication(seeker, applied.id, resume.id);
            await setJobPreference(seeker, { desiredJobTitle: "Backend Engineer" });

            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);

            const returnedIds = response.body.items.map((item: { id: string }) => item.id);
            expect(returnedIds).not.toContain(applied.id);
            expect(returnedIds.length).toBeGreaterThan(0);
        });

        it("falls back to the newest postings when no preference is stated", async () => {
            await createJob(employer, { title: "Backend Engineer" });

            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);
            expect(response.body.basis).toBe("LATEST");
            expect(response.body.items.length).toBeGreaterThan(0);
            // Nothing was ranked, so nothing is claimed.
            expect(response.body.items[0].score).toBe(0);
            expect(response.body.items[0].reasons).toEqual([]);
        });

        it("returns nothing when the seeker has set themselves to Not Looking", async () => {
            await createJob(employer, { title: "Backend Engineer" });
            await setJobPreference(seeker, {
                desiredJobTitle: "Backend Engineer",
                jobSearchStatus: "NOT_LOOKING",
            });

            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);
            expect(response.body.basis).toBe("NOT_LOOKING");
            expect(response.body.items).toEqual([]);
        });

        it("omits a posting that matches nothing the seeker asked for", async () => {
            await createJob(employer, { title: "Business Analyst", location: "Hanoi" });
            await setJobPreference(seeker, { desiredJobTitle: "Machine Learning" });

            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);

            expect(response.body.basis).toBe("PREFERENCES");
            expect(response.body.items).toEqual([]);
        });
    });

    describe("role boundaries", () => {
        it("cannot reach Employer endpoints", async () => {
            const response = await request(app)
                .get("/employer/jobs")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(403);
        });

        it("cannot reach Back-Office endpoints", async () => {
            const response = await request(app)
                .get("/admin/users")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(403);
        });
    });
});
