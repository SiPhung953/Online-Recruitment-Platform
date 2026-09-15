import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { disconnectDatabase, resetDatabase } from "../setup/TestDatabase";
import {
    createEmployer,
    createJob,
    daysFromNow,
    type TestEmployer,
} from "../setup/Fixtures";

/**
 * UC-EMP-01 (Publish), UC-EMP-02 (List), UC-EMP-03 (Edit) and
 * UC-EMP-04 (Close / Re-open).
 *
 * The ownership cases are the ones that matter. A second employer exists in
 * every one of them, because "an employer may only manage their own postings"
 * is untestable with a single account — and it is the rule that, if broken,
 * lets one company edit another's adverts.
 */
describe("Employer", () => {
    let employer: TestEmployer;
    let rivalEmployer: TestEmployer;

    beforeEach(async () => {
        await resetDatabase();
        employer = await createEmployer("employer@test.local", "Test Company");
        rivalEmployer = await createEmployer("rival@test.local", "Rival Company");
    });

    afterAll(disconnectDatabase);

    function validJobBody() {
        return {
            title: "Backend Engineer",
            description: "Build and operate the services behind our platform.",
            requirement: "Comfortable with TypeScript and relational databases.",
            employmentType: "ON_SITE",
            location: "Ho Chi Minh City",
            deadline: daysFromNow(30).toISOString(),
        };
    }

    describe("POST /employer/jobs", () => {
        /**
         * The single most important assertion in this file. A posting that went
         * straight to ACTIVE would bypass moderation entirely (UC-ADMIN-01) and
         * be publicly visible the moment it was written.
         */
        it("creates the posting as PENDING_APPROVAL, not ACTIVE", async () => {
            const response = await request(app)
                .post("/employer/jobs")
                .set("Authorization", employer.authHeader)
                .send(validJobBody());

            expect(response.status).toBe(201);

            const stored = await prisma.job.findFirst({ where: { createdByEmployerId: employer.id } });
            expect(stored?.status).toBe("PENDING_APPROVAL");
            expect(stored?.approvedAt).toBeNull();
        });

        it("keeps a newly created posting out of public search until it is approved", async () => {
            await request(app)
                .post("/employer/jobs")
                .set("Authorization", employer.authHeader)
                .send(validJobBody());

            const publicSearch = await request(app).get("/jobs");

            expect(publicSearch.body.items).toHaveLength(0);
        });

        it("rejects a deadline in the past", async () => {
            const response = await request(app)
                .post("/employer/jobs")
                .set("Authorization", employer.authHeader)
                .send({ ...validJobBody(), deadline: new Date("2020-01-01").toISOString() });

            expect(response.status).toBe(400);
        });

        it("rejects an empty title", async () => {
            const response = await request(app)
                .post("/employer/jobs")
                .set("Authorization", employer.authHeader)
                .send({ ...validJobBody(), title: "   " });

            expect(response.status).toBe(400);
        });
    });

    describe("GET /employer/jobs", () => {
        it("lists only the caller's own postings", async () => {
            await createJob(employer, { title: "Our Role" });
            await createJob(rivalEmployer, { title: "Their Role" });

            const response = await request(app)
                .get("/employer/jobs")
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].title).toBe("Our Role");
        });
    });

    describe("ownership", () => {
        it("refuses to show another employer's posting", async () => {
            const rivalJob = await createJob(rivalEmployer);

            const response = await request(app)
                .get(`/employer/jobs/${rivalJob.id}`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(403);
        });

        it("refuses to edit another employer's posting", async () => {
            const rivalJob = await createJob(rivalEmployer, { title: "Their Role" });

            const response = await request(app)
                .patch(`/employer/jobs/${rivalJob.id}`)
                .set("Authorization", employer.authHeader)
                .send({ ...validJobBody(), title: "Hijacked" });

            expect(response.status).toBe(403);

            const unchanged = await prisma.job.findUnique({ where: { id: rivalJob.id } });
            expect(unchanged?.title).toBe("Their Role");
        });

        it("refuses to close another employer's posting", async () => {
            const rivalJob = await createJob(rivalEmployer);

            const response = await request(app)
                .patch(`/employer/jobs/${rivalJob.id}/close`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(403);
        });

        it("404s for a posting that does not exist", async () => {
            const response = await request(app)
                .get("/employer/jobs/00000000-0000-4000-a000-000000000000")
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(404);
        });
    });

    describe("PATCH /employer/jobs/{id} (edit)", () => {
        /**
         * Editing is what returns a posting to moderation, from whichever
         * editable status it was in. An employer cannot change the text of a
         * live advert without a moderator seeing the new text.
         */
        it("returns an edited ACTIVE posting to moderation and unpublishes it", async () => {
            const job = await createJob(employer, { status: "ACTIVE" });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}`)
                .set("Authorization", employer.authHeader)
                .send({ ...validJobBody(), title: "Backend Engineer (updated)" });

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("PENDING_APPROVAL");
            expect(stored?.approvedAt).toBeNull();

            const publicSearch = await request(app).get("/jobs");
            expect(publicSearch.body.items).toHaveLength(0);
        });

        it("returns an edited REJECTED posting to moderation, clearing the rejection", async () => {
            const job = await createJob(employer, { status: "REJECTED" });
            await prisma.job.update({
                where: { id: job.id },
                data: { rejectedAt: new Date(), rejectionReason: "Not a real role." },
            });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}`)
                .set("Authorization", employer.authHeader)
                .send(validJobBody());

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("PENDING_APPROVAL");
            expect(stored?.rejectionReason).toBeNull();
        });

        /**
         * EXPIRED is a dead end. It is not in EDITABLE_STATUSES, so an employer
         * whose posting lapsed cannot set a new deadline to revive it — the
         * only remaining transition is deletion.
         */
        it("refuses to edit an EXPIRED posting, leaving it with no way back", async () => {
            const job = await createJob(employer, { status: "EXPIRED" });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}`)
                .set("Authorization", employer.authHeader)
                .send(validJobBody());

            expect(response.status).toBe(400);
        });
    });

    describe("PATCH /employer/jobs/{id}/delete", () => {
        it("deletes a posting awaiting moderation", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}/delete`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("DELETED");
        });

        it("deletes an expired posting, the only transition left to it", async () => {
            const job = await createJob(employer, { status: "EXPIRED" });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}/delete`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("DELETED");
        });
    });

    describe("PATCH /employer/jobs/{id}/close and /reopen", () => {
        it("closes an active posting and removes it from public search", async () => {
            const job = await createJob(employer);

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}/close`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("CLOSED");
            expect(stored?.closedAt).not.toBeNull();

            const publicSearch = await request(app).get("/jobs");
            expect(publicSearch.body.items).toHaveLength(0);
        });

        it("refuses to close the same posting twice", async () => {
            const job = await createJob(employer, { status: "CLOSED" });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}/close`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(409);
        });

        it("refuses to re-open a posting whose deadline has passed", async () => {
            // Re-opening must not resurrect a posting that would immediately be
            // expired again, so the employer has to set a new deadline first.
            const job = await createJob(employer, { status: "CLOSED", deadline: new Date("2020-01-01") });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}/reopen`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(400);
        });

        /**
         * UC-EMP-04: "Job Posting sau khi mở lại sẽ quay về trạng thái
         * PENDING_APPROVAL và phải được Back-Office Worker duyệt lại trước khi
         * hiển thị public."
         *
         * Re-opening sends the posting back for moderation rather than
         * restoring it to ACTIVE, so a closed advert cannot be edited and
         * quietly re-published without a second review.
         */
        it("sends a re-opened posting back for moderation rather than publishing it", async () => {
            const job = await createJob(employer, { status: "CLOSED" });

            const response = await request(app)
                .patch(`/employer/jobs/${job.id}/reopen`)
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("PENDING_APPROVAL");
            expect(stored?.closedAt).toBeNull();
            expect(stored?.approvedAt).toBeNull();

            // ...and it stays out of public search until a moderator approves.
            const publicSearch = await request(app).get("/jobs");
            expect(publicSearch.body.items).toHaveLength(0);
        });
    });

    describe("role boundaries", () => {
        it("cannot reach Job Seeker endpoints", async () => {
            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(403);
        });

        it("cannot reach Back-Office endpoints", async () => {
            const response = await request(app)
                .get("/admin/jobs")
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(403);
        });
    });
});
