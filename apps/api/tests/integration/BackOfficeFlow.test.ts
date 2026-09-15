import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { disconnectDatabase, resetDatabase } from "../setup/TestDatabase";
import {
    createAdmin,
    createEmployer,
    createJob,
    createJobSeeker,
    type TestActor,
    type TestEmployer,
} from "../setup/Fixtures";

/**
 * UC-ADMIN-01 (Approve Job Posting), UC-ADMIN-04 (Ban / Unban) and
 * UC-ADMIN-05 (View Logs).
 *
 * Moderation is the gate the whole publishing flow depends on, so these tests
 * check the *effect* of approving — that the posting becomes publicly
 * reachable — rather than only the response code.
 */
describe("Back-Office Worker", () => {
    let admin: TestActor;
    let employer: TestEmployer;

    beforeEach(async () => {
        await resetDatabase();
        admin = await createAdmin();
        employer = await createEmployer();
    });

    afterAll(disconnectDatabase);

    describe("PATCH /admin/jobs/{id}/approve", () => {
        it("publishes a pending posting and stamps the approval time", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });

            const response = await request(app)
                .patch(`/admin/jobs/${job.id}/approve`)
                .set("Authorization", admin.authHeader);

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("ACTIVE");
            expect(stored?.approvedAt).not.toBeNull();
        });

        it("makes the posting visible to the public only after approval", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });

            const before = await request(app).get("/jobs");
            expect(before.body.items).toHaveLength(0);

            await request(app)
                .patch(`/admin/jobs/${job.id}/approve`)
                .set("Authorization", admin.authHeader);

            const after = await request(app).get("/jobs");
            expect(after.body.items).toHaveLength(1);
        });

        /**
         * The architectural claim worth proving: the status change and its log
         * row commit in one transaction, so a moderation decision can never
         * happen without a record of who made it.
         */
        it("writes exactly one audit log row, attributed to the moderator", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });

            await request(app)
                .patch(`/admin/jobs/${job.id}/approve`)
                .set("Authorization", admin.authHeader);

            const logs = await prisma.log.findMany({
                where: { action: "JOB_APPROVED", targetId: job.id },
            });

            expect(logs).toHaveLength(1);
            expect(logs[0].actorId).toBe(admin.id);
            expect(logs[0].targetType).toBe("JOB");
        });
    });

    describe("PATCH /admin/jobs/{id}/reject", () => {
        it("rejects a pending posting with a reason and keeps it unpublished", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });

            const response = await request(app)
                .patch(`/admin/jobs/${job.id}/reject`)
                .set("Authorization", admin.authHeader)
                .send({ rejectionReason: "The description does not describe a real role." });

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("REJECTED");
            expect(stored?.rejectionReason).toBe("The description does not describe a real role.");

            const publicSearch = await request(app).get("/jobs");
            expect(publicSearch.body.items).toHaveLength(0);
        });
    });

    describe("PATCH /admin/jobs/{id}/delete", () => {
        /**
         * The asymmetry worth knowing: an Employer may delete their own posting
         * from any status, but a Moderator may not delete one awaiting
         * moderation — rejecting it leaves the employer a reason and a way
         * forward, whereas deleting it would not.
         */
        it("refuses to delete a posting awaiting moderation", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });

            const response = await request(app)
                .patch(`/admin/jobs/${job.id}/delete`)
                .set("Authorization", admin.authHeader)
                .send({ deletionReason: "Spam." });

            expect(response.status).toBe(400);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("PENDING_APPROVAL");
        });

        it("deletes a published posting", async () => {
            const job = await createJob(employer, { status: "ACTIVE" });

            const response = await request(app)
                .patch(`/admin/jobs/${job.id}/delete`)
                .set("Authorization", admin.authHeader)
                .send({ deletionReason: "Violates the content policy." });

            expect(response.status).toBe(200);

            const stored = await prisma.job.findUnique({ where: { id: job.id } });
            expect(stored?.status).toBe("DELETED");
        });
    });

    describe("PATCH /admin/users/{id}/ban", () => {
        /**
         * The reason the banned check lives in `authentication.ts` rather than
         * in each service: a ban has to take effect on the token the user is
         * already holding, not just at their next login.
         */
        it("takes effect on a token the banned user already holds", async () => {
            const seeker = await createJobSeeker();

            const beforeBan = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);
            expect(beforeBan.status).toBe(200);

            const ban = await request(app)
                .patch(`/admin/users/${seeker.id}/ban`)
                .set("Authorization", admin.authHeader);
            expect(ban.status).toBe(200);

            const afterBan = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);
            expect(afterBan.status).toBe(403);
        });

        it("restores access when the account is unbanned", async () => {
            const seeker = await createJobSeeker();

            await request(app)
                .patch(`/admin/users/${seeker.id}/ban`)
                .set("Authorization", admin.authHeader);
            await request(app)
                .patch(`/admin/users/${seeker.id}/unban`)
                .set("Authorization", admin.authHeader);

            const response = await request(app)
                .get("/recommendations")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(200);
        });
    });

    describe("GET /admin/logs", () => {
        it("returns the audit trail to a moderator", async () => {
            const job = await createJob(employer, { status: "PENDING_APPROVAL" });
            await request(app)
                .patch(`/admin/jobs/${job.id}/approve`)
                .set("Authorization", admin.authHeader);

            const response = await request(app)
                .get("/admin/logs")
                .set("Authorization", admin.authHeader);

            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeGreaterThan(0);
        });
    });

    describe("role boundaries", () => {
        it("refuses an employer", async () => {
            const response = await request(app)
                .get("/admin/jobs")
                .set("Authorization", employer.authHeader);

            expect(response.status).toBe(403);
        });

        it("refuses a job seeker", async () => {
            const seeker = await createJobSeeker();

            const response = await request(app)
                .get("/admin/logs")
                .set("Authorization", seeker.authHeader);

            expect(response.status).toBe(403);
        });
    });
});
