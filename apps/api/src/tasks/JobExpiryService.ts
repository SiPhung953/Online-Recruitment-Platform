import { prisma } from '../lib/prisma';
import { AuditLogger } from '../logging/AuditLogger';
import { JobExpired } from '../logging/LogMessages';

/**
 * Turns job postings whose deadline has passed into `EXPIRED`.
 *
 * UC-EMP-01: once the current date passes `jobs.deadline`, a posting is
 * considered expired — it must not appear in public search and must not accept
 * new applications. The public queries enforce that rule on every read, so the
 * platform behaves correctly the instant a deadline lapses. This service is
 * what makes the *stored* status agree with it, which is what the Employer
 * list, the moderation screens and the audit log all read from.
 *
 * It takes no `currentUser` and asserts no role, because nothing routes to it
 * over HTTP. That is also why it cannot reuse a `JobManagementService` method:
 * those all open with a role guard, and there is no actor here to satisfy one.
 */
export class JobExpiryService {
    private readonly auditLogger = new AuditLogger();

    /** Expires every overdue posting and returns how many were changed. */
    public async expireOverdueJobs(): Promise<number> {
        // 1. Find the postings whose deadline has passed.
        //    Only ACTIVE is swept. A PENDING_APPROVAL posting past its deadline
        //    is left alone on purpose: a Moderator already cannot approve it,
        //    and EXPIRED is not an editable status — expiring it would strand
        //    the Employer with no way to set a new deadline. CLOSED is left
        //    alone too, since re-opening already demands a future deadline.
        const overdueJobs = await prisma.job.findMany({
            where: {
                status: "ACTIVE",
                deadline: { lt: new Date() },
            },
            select: {
                id: true,
                title: true,
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // 2. Expire them one posting at a time, each with its own log row.
        let expiredCount = 0;

        for (const job of overdueJobs) {
            try {
                // The status change and its Log row commit as one unit, so a
                // posting can never expire without a record of it having done so.
                await prisma.$transaction(async (tx) => {
                    await tx.job.update({
                        where: {
                            id: job.id,
                        },
                        data: {
                            status: "EXPIRED",
                        },
                    });

                    await this.auditLogger.log(tx, {
                        action: "JOB_EXPIRED",
                        targetId: job.id,
                        message: JobExpired(job.title, job.company.name),
                        // No actor: the platform did this, not a person.
                        actor: null,
                    });
                });

                expiredCount++;
            } catch (error) {
                // One bad row must not abandon the rest of the batch — the next
                // sweep picks this posting up again.
                console.error(`Failed to expire job posting ${job.id}:`, error);
            }
        }

        return expiredCount;
    }
}
