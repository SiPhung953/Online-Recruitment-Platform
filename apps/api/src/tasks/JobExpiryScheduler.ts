import { JobExpiryService } from './JobExpiryService';

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const jobExpiryService = new JobExpiryService();

// A sweep that outruns its own interval must not have a second one stacked on
// top of it, or two passes would contend over the same rows.
let sweepInProgress = false;

async function runSweep(): Promise<void> {
    if (sweepInProgress) {
        return;
    }
    sweepInProgress = true;

    try {
        const expiredCount = await jobExpiryService.expireOverdueJobs();
        if (expiredCount > 0) {
            console.log(`Job expiry sweep: expired ${expiredCount} job posting(s).`);
        }
    } catch (error) {
        // A failed sweep must never take the API process down with it.
        console.error("Job expiry sweep failed:", error);
    } finally {
        sweepInProgress = false;
    }
}

/**
 * Starts the recurring job-expiry sweep.
 *
 * The timer holds no business logic of its own — it is only a second caller of
 * `JobExpiryService`, so the same work can be triggered from a script or an
 * endpoint later without moving any rules.
 *
 * Expiry only advances while the API is running. That is acceptable because
 * the public queries check the deadline directly, so a posting is never
 * offered to a Job Seeker between its deadline and the next sweep.
 */
export function startJobExpiryScheduler(): void {
    const intervalMs = Number(process.env.JOB_EXPIRY_INTERVAL_MS) || ONE_HOUR_IN_MS;

    // Sweep once at boot: the API may have been down across a deadline, and the
    // stored status should catch up now rather than a full interval from now.
    void runSweep();

    setInterval(() => void runSweep(), intervalMs);
}
