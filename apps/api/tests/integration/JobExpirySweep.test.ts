import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../src/lib/prisma";
import { JobExpiryService } from "../../src/tasks/JobExpiryService";
import { disconnectDatabase, resetDatabase } from "../setup/TestDatabase";
import { createEmployer, createJob, daysAgo, daysFromNow, type TestEmployer } from "../setup/Fixtures";

/**
 * UC-EMP-01's deadline rule, on the write side.
 *
 * This is the only part of the system that cannot be demonstrated by using the
 * application: it needs a deadline to pass, and nobody can wait out a deadline
 * during a demonstration. Backdating a row and calling the sweep directly is
 * what makes the behaviour observable at all.
 *
 * No HTTP here — `JobExpiryService` takes no `currentUser` and no route reaches
 * it, so calling the service is testing it at its real boundary.
 */
describe("Job expiry sweep", () => {
    let employer: TestEmployer;
    const expiryService = new JobExpiryService();

    beforeEach(async () => {
        await resetDatabase();
        employer = await createEmployer();
    });

    afterAll(disconnectDatabase);

    it("expires an active posting whose deadline has passed", async () => {
        const job = await createJob(employer, { status: "ACTIVE", deadline: daysAgo(1) });

        const expiredCount = await expiryService.expireOverdueJobs();

        expect(expiredCount).toBe(1);
        const stored = await prisma.job.findUnique({ where: { id: job.id } });
        expect(stored?.status).toBe("EXPIRED");
    });

    it("leaves a posting whose deadline is still ahead alone", async () => {
        const job = await createJob(employer, { status: "ACTIVE", deadline: daysFromNow(7) });

        const expiredCount = await expiryService.expireOverdueJobs();

        expect(expiredCount).toBe(0);
        const stored = await prisma.job.findUnique({ where: { id: job.id } });
        expect(stored?.status).toBe("ACTIVE");
    });

    /**
     * Deliberate scope limit, not an oversight. A moderator cannot approve a
     * posting whose deadline has lapsed, and EXPIRED is not an editable status
     * — expiring it here would leave the employer with no way to set a new
     * deadline and no way to get the posting back.
     */
    it("does not touch a posting still awaiting moderation", async () => {
        const job = await createJob(employer, { status: "PENDING_APPROVAL", deadline: daysAgo(1) });

        await expiryService.expireOverdueJobs();

        const stored = await prisma.job.findUnique({ where: { id: job.id } });
        expect(stored?.status).toBe("PENDING_APPROVAL");
    });

    it("does not touch a closed posting", async () => {
        const job = await createJob(employer, { status: "CLOSED", deadline: daysAgo(1) });

        await expiryService.expireOverdueJobs();

        const stored = await prisma.job.findUnique({ where: { id: job.id } });
        expect(stored?.status).toBe("CLOSED");
    });

    it("records each expiry in the audit log with no actor", async () => {
        const job = await createJob(employer, { status: "ACTIVE", deadline: daysAgo(1) });

        await expiryService.expireOverdueJobs();

        const logs = await prisma.log.findMany({
            where: { action: "JOB_EXPIRED", targetId: job.id },
        });

        expect(logs).toHaveLength(1);
        // The platform did this, not a person — a log row attributed to a user
        // would misrepresent who acted.
        expect(logs[0].actorId).toBeNull();
    });

    it("is safe to run twice: the second sweep finds nothing left to do", async () => {
        await createJob(employer, { status: "ACTIVE", deadline: daysAgo(1) });

        const first = await expiryService.expireOverdueJobs();
        const second = await expiryService.expireOverdueJobs();

        expect(first).toBe(1);
        expect(second).toBe(0);
        expect(await prisma.log.count({ where: { action: "JOB_EXPIRED" } })).toBe(1);
    });

    it("expires several overdue postings in one sweep", async () => {
        await createJob(employer, { title: "One", status: "ACTIVE", deadline: daysAgo(1) });
        await createJob(employer, { title: "Two", status: "ACTIVE", deadline: daysAgo(5) });
        await createJob(employer, { title: "Three", status: "ACTIVE", deadline: daysFromNow(5) });

        const expiredCount = await expiryService.expireOverdueJobs();

        expect(expiredCount).toBe(2);
        expect(await prisma.job.count({ where: { status: "EXPIRED" } })).toBe(2);
        expect(await prisma.job.count({ where: { status: "ACTIVE" } })).toBe(1);
    });
});
