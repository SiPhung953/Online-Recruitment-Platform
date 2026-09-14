import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/HttpError';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { assertAdmin } from '../../api-shared/guard/AssertRole';

import { AuditLogger } from '../../logging/AuditLogger';
import { JobApproved, JobRejected, JobDeleted } from '../../logging/LogMessages';

import { JobStatus } from '../../api-shared/type/JobStatus';
import { ModerationJobListResponse } from './ModerationJobListResponse';
import { ModerationJobDetailResponse } from './ModerationJobDetailResponse';
import { ApproveJobResponse } from './ApproveJobResponse';
import { RejectJobRequest } from './RejectJobRequest';
import { RejectJobResponse } from './RejectJobResponse';
import { DeleteJobRequest } from './DeleteJobRequest';
import { DeleteJobResponse } from './DeleteJobResponse';

export class JobModerationService {
    private readonly auditLogger = new AuditLogger();

    // private helper for validating deletion/rejection reason (trimming, no empty field, no longer than 255 char)
    private validateReason(reason: string): string {
        const trimmed = reason?.trim();
        if (!trimmed) {
            throw new HttpError(400, "Reason cannot be empty.")
        }
        if (trimmed.length > 255) {
            throw new HttpError(400, "Reason must be at most 255 characters.")
        }
        return trimmed;
    }
    
    public async getModerationJobs(
        currentUser: CurrentUser, 
        jobStatus?: JobStatus
    ): Promise<ModerationJobListResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find all job with status filter
        const jobs = await prisma.job.findMany({
            where: {
                status: jobStatus
            }, 
            select: {
                id: true,
                title: true,
                status: true,
                deadline: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdAt: true,
            },
        });

        // 3. Map job and company info to array
        const items = jobs.map(job => ({
            jobId: job.id,
            title: job.title,
            status: job.status,
            deadline: job.deadline,
            companyId: job.company.id,
            companyName: job.company.name,
            createdAt: job.createdAt,
        }));
        
        return { items };
    }

    public async getModerationJobDetail(
        currentUser: CurrentUser,
        jobId: string
    ): Promise<ModerationJobDetailResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find job with id
        const jobDetail = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
            select: {
                id: true,
                title: true,
                description: true,
                requirement: true,
                employmentType: true,
                location: true,
                status: true,
                deadline: true,
                createdAt: true,
                updatedAt: true,
                approvedAt: true,
                deletedAt: true,
                deletionReason: true,
                rejectedAt: true,
                rejectionReason: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // 3. If job posting does not exist
        if (!jobDetail) {
            throw new HttpError(404, "Job posting not found.");
        }

        return {
            jobId: jobDetail.id,
            title: jobDetail.title,
            description: jobDetail.description,
            requirement: jobDetail.requirement,
            employmentType: jobDetail.employmentType,
            location: jobDetail.location,
            status: jobDetail.status,
            deadline: jobDetail.deadline,
            createdAt: jobDetail.createdAt,
            updatedAt: jobDetail.updatedAt,
            approvedAt: jobDetail.approvedAt ?? undefined,
            deletedAt: jobDetail.deletedAt ?? undefined,
            deletionReason: jobDetail.deletionReason ?? undefined,
            rejectedAt: jobDetail.rejectedAt ?? undefined,
            rejectionReason: jobDetail.rejectionReason ?? undefined,
            companyId: jobDetail.company.id,
            companyName: jobDetail.company.name,
        };
    }

    public async approveJobPosting(
        currentUser: CurrentUser,
        jobId: string
    ): Promise<ApproveJobResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find job by id
        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
            select: {
                status: true,
                deadline: true,
                title: true,
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // 3.1. If job posting not found:
        if (!job) {
            throw new HttpError(404, "Job posting not found.");
        };

        // 3.2 If job posting is already ACTIVE
        // This check need to happen before 3.3, else 3.3 will capture all the conditions.
        if (job.status === "ACTIVE") {
            throw new HttpError(409, "This job posting is already approved.")
        };

        // 3.3 If job posting does not have PENDING_APPROVAL status 
        if (job.status !== "PENDING_APPROVAL") {
            throw new HttpError(400, "This job posting is not approvable.")
        };

        // 3.4 If deadline has already passed
        if (job.deadline < new Date()) {
            throw new HttpError(400, "This job posting has expired.")
        };

        // 4. Update job status and write the audit log in one transaction
        const approvedJob = await prisma.$transaction(async (tx) => {
            const updated = await tx.job.update({
                where: {
                    id: jobId,
                },
                data: {
                    status: "ACTIVE",
                    approvedAt: new Date(),
                    rejectedAt: null,
                    rejectionReason: null
                },
                select: {
                    id: true,
                    approvedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_APPROVED",
                targetId: jobId,
                message: JobApproved(job.title, job.company.name),
                actor: currentUser,
            });

            return updated;
        });

        return {
            jobId: approvedJob.id,
            status: "ACTIVE",
            approvedAt: approvedJob.approvedAt || new Date(),
            message: "Job posting approved successfully."
        };
    }

    public async rejectJobPosting(
        currentUser: CurrentUser,
        jobId: string,
        requestBody: RejectJobRequest
    ): Promise<RejectJobResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find job by id
        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
            select: {
                status: true,
                title: true,
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // 3.1. If job posting is not found
        if (!job) {
            throw new HttpError(404, "Job posting not found.");
        };

        // 3.2. If job posting is already REJECTED
        if (job.status === "REJECTED") {
            throw new HttpError(409, "This job posting is already rejected.")
        };

        // 3.3 If job posting does not have PENDING_APPROVAL status 
        if (job.status !== "PENDING_APPROVAL") {
            throw new HttpError(400, "This job posting is not rejectable.")
        };

        // 4. Update job status and write the audit log in one transaction
        const rejectionReason = this.validateReason(requestBody.rejectionReason);
        const rejectedJob = await prisma.$transaction(async (tx) => {
            const updated = await tx.job.update({
                where: {
                    id: jobId,
                },
                data: {
                    status: "REJECTED",
                    rejectedAt: new Date(),
                    rejectionReason,
                    approvedAt: null,
                },
                select: {
                    id: true,
                    rejectedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_REJECTED",
                targetId: jobId,
                message: JobRejected(job.title, job.company.name, rejectionReason),
                actor: currentUser,
            });

            return updated;
        });

        return {
            jobId: rejectedJob.id,
            status: "REJECTED",
            rejectionReason,
            rejectedAt: rejectedJob.rejectedAt || new Date(),
            message: "Job posting rejected successfully."
        };
    }

    public async deleteJobPosting(
        currentUser: CurrentUser,
        jobId: string,
        requestBody: DeleteJobRequest
    ): Promise<DeleteJobResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find job by id
        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
            select: {
                status: true,
                title: true,
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // 3.1. If job posting is not found
        if (!job) {
            throw new HttpError(404, "Job posting not found.");
        };

        // 3.2. If job posting is already DELETED
        if (job.status === "DELETED") {
            throw new HttpError(409, "This job posting is already deleted.")
        };

        // 3.3 If job posting have PENDING_APPROVAL status 
        if (job.status === "PENDING_APPROVAL") {
            throw new HttpError(400, "A PENDING_APPROVAL job posting cannot be deleted; reject it instead.")
        };

        // 4. Update job posting's status and write the audit log in one transaction
        const deletionReason = this.validateReason(requestBody.deletionReason);
        const deletedJob = await prisma.$transaction(async (tx) => {
            const updated = await tx.job.update({
                where: {
                    id: jobId,
                },
                data: {
                    status: "DELETED",
                    deletedAt: new Date(),
                    deletionReason,
                },
                select: {
                    id: true,
                    deletedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_DELETED",
                targetId: jobId,
                message: JobDeleted(job.title, job.company.name, deletionReason),
                actor: currentUser,
            });

            return updated;
        });

        return {
            jobId: deletedJob.id,
            status: "DELETED",
            deletedAt: deletedJob.deletedAt || new Date(),
            deletionReason,
            message: "Job posting deleted successfully."
        }
    }
}