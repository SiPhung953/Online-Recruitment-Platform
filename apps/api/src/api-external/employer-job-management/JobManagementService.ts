import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/HttpError';

import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { assertEmployer } from '../../api-shared/guard/AssertRole';

import { AuditLogger } from '../../logging/AuditLogger';
import { JobCreated, JobUpdated, JobClosed, JobReopened, JobDeleted } from '../../logging/LogMessages';

import { JobPostingBody } from './JobPostingBody';
import { GetMyJobsResponse } from './GetMyJobsResponse';
import { CreateJobPostingRequest } from './CreateJobPostingRequest';
import { CreateJobPostingResponse } from './CreateJobPostingResponse';
import { GetMyJobDetailResponse } from './GetMyJobDetailResponse';
import { UpdateJobPostingResponse } from './UpdateJobPostingResponse';
import { UpdateJobPostingRequest } from './UpdateJobPostingRequest';
import { CloseJobPostingResponse } from './CloseJobPostingResponse';
import { ReopenJobPostingResponse } from './ReopenJobPostingResponse';
import { DeleteJobPostingResponse } from './DeleteJobPostingResponse';

export class JobManagementService {
    private readonly auditLogger = new AuditLogger();

    // Helper function for checking job existence and ownership
    private async findOwnedJobs(currentUser: CurrentUser, jobId: string) {
        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            },
            select: {
                id: true,
                createdByEmployerId: true,
                title: true,
                description: true,
                requirement: true,
                employmentType: true,
                location: true,
                status: true,
                deadline: true,
                createdAt: true,
                updatedAt: true,
                closedAt: true,
                deletedAt: true,
                approvedAt: true,
                rejectedAt: true,
                rejectionReason: true,
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!job) {
            throw new HttpError(404, "Job posting not found.");
        }

        if (job.createdByEmployerId !== currentUser.id) {
            throw new HttpError(403, "You are not allowed to manage this job posting.");
        }

        return job;
    }

    // Helper function for validating input information from the user
    private validateJobInput(body: JobPostingBody): JobPostingBody {
        // Trimming input
        const trimmedTitle = body?.title?.trim();
        if (!trimmedTitle) {
            throw new HttpError(400, "Title cannot be empty.");
        }
        const trimmedDescription = body?.description?.trim();
        if (!trimmedDescription) {
            throw new HttpError(400, "Description cannot be empty.");
        }
        const trimmedRequirement = body?.requirement?.trim();
        if (!trimmedRequirement) {
            throw new HttpError(400, "Requirement cannot be empty.");
        }
        const trimmedLocation = body?.location?.trim();
        if (!trimmedLocation) {
            throw new HttpError(400, "Location cannot be empty.");
        }

        // Checking length caps
        if (trimmedTitle.length > 255) {
            throw new HttpError(400, "Title can only be at most 255 character long.");
        }
        if (trimmedLocation.length > 255) {
            throw new HttpError(400, "Location can only be at most 255 character long.");
        }
        if (trimmedDescription.length > 10000) {
            throw new HttpError(400, "Description can only be at most 10000 character long.");
        }
        if (trimmedRequirement.length > 10000) {
            throw new HttpError(400, "Requirement can only be at most 10000 character long.");
        }

        // Deadline logic
        const deadline = new Date(body.deadline)
        // 1. Deadline should be of correct date form
        if (Number.isNaN(deadline.getTime())) {
            throw new HttpError(400, "Deadline is not a valid date");
        }
        // 2. Deadline can't be in the past
        if (deadline <= new Date()) {
            throw new HttpError(400, "Deadline must be a future date");
        }

        // Return all value
        return {
            title: trimmedTitle,
            description: trimmedDescription,
            location: trimmedLocation,
            requirement: trimmedRequirement,
            employmentType: body.employmentType,
            deadline: deadline
        }
    }

    public async getMyJobs(
        currentUser: CurrentUser
    ): Promise<GetMyJobsResponse> {
        // 1. Check whether user is an Employer
        assertEmployer(currentUser);

        // 2. Find all job posted by the company
        const jobs = await prisma.job.findMany({
            where: {
                createdByEmployerId: currentUser.id,
            },
            select: {
                id: true,
                title: true,
                location: true,
                employmentType: true,
                status: true,
                deadline: true,
                createdAt: true,
                closedAt: true,
                deletedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // 3. Return all jobs of all status
        return {
            items: jobs.map(job => ({
                jobId: job.id,
                title: job.title,
                location: job.location,
                employmentType: job.employmentType,
                status: job.status,
                deadline: job.deadline,
                createdAt: job.createdAt,
                closedAt: job.closedAt || undefined,
                deletedAt: job.deletedAt || undefined
            }))
        }
    }

    public async getMyJobDetail(
        currentUser: CurrentUser,
        jobId: string
    ): Promise<GetMyJobDetailResponse> {
        // 1. Check whether user is an Employer
        assertEmployer(currentUser);

        // 2. Find job by id belonging to the company
        const jobInfo = await this.findOwnedJobs(currentUser, jobId);

        // 3. Select every field existed for a job
        return {
            jobId: jobInfo.id,
            title: jobInfo.title,
            description: jobInfo.description,
            requirement: jobInfo.requirement,
            employmentType: jobInfo.employmentType,
            location: jobInfo.location,
            status: jobInfo.status,
            deadline: jobInfo.deadline,
            createdAt: jobInfo.createdAt,
            updatedAt: jobInfo.updatedAt,
            closedAt: jobInfo.closedAt || undefined,
            deletedAt: jobInfo.deletedAt || undefined,
            approvedAt: jobInfo.approvedAt || undefined,
            rejectedAt: jobInfo.rejectedAt || undefined,
            rejectionReason: jobInfo.rejectionReason || undefined
        }
    }

    public async createJobPosting(
        currentUser: CurrentUser,
        requestBody: CreateJobPostingRequest
    ): Promise<CreateJobPostingResponse> {
        // 1. Check whether user is an Employer
        assertEmployer(currentUser);

        // 2. Check whether the user have a company profile
        const company = await prisma.company.findUnique({
            where: {
                ownerEmployerId: currentUser.id,
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (!company) {
            throw new HttpError(400, "You need to register a Company before you can publish.");
        }

        // 3. Validate the input information
        const validatedJobInput = this.validateJobInput(requestBody);

        // 4. Create the job posting and write the audit log in one transaction
        const job = await prisma.$transaction(async (tx) => {
            const created = await tx.job.create({
                data: {
                    createdByEmployerId: currentUser.id,
                    companyId: company.id,
                    ...validatedJobInput,
                    status: "PENDING_APPROVAL",
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    location: true,
                    requirement: true,
                    employmentType: true,
                    deadline: true,
                    createdAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_CREATED",
                targetId: created.id,
                message: JobCreated(created.title, company.name),
                actor: currentUser,
            });

            return created;
        });

        return {
            jobId: job.id,
            title: job.title,
            description: job.description,
            location: job.location,
            requirement: job.requirement,
            employmentType: job.employmentType,
            status: "PENDING_APPROVAL",
            deadline: job.deadline,
            createdAt: job.createdAt
        };
    }

    public async updateJobPosting(
        currentUser: CurrentUser,
        jobId: string,
        requestBody: UpdateJobPostingRequest
    ): Promise<UpdateJobPostingResponse> {
        // 1. Check whether user is an Employer
        assertEmployer(currentUser);

        // 2. Find job by id belonging to the company
        const jobInfo = await this.findOwnedJobs(currentUser, jobId);

        // 3. Depending on the status of the job post, the employer may or may not edit it
        const EDITABLE_STATUSES = ["PENDING_APPROVAL", "ACTIVE", "REJECTED", "CLOSED"];
        if (!EDITABLE_STATUSES.includes(jobInfo.status)) {
            throw new HttpError(400, `A ${jobInfo.status} job posting cannot be edited.`);
        }

        // 4. If the job posting is editable, validate the input field
        const validatedJobInput = this.validateJobInput(requestBody);

        // 5. Update the validated fields and write the audit log in one transaction
        const updatedJob = await prisma.$transaction(async (tx) => {
            const updated = await tx.job.update({
                where: {
                    id: jobId,
                },
                data: {
                    title: validatedJobInput.title,
                    description: validatedJobInput.description,
                    requirement: validatedJobInput.requirement,
                    employmentType: validatedJobInput.employmentType,
                    location: validatedJobInput.location,
                    status: "PENDING_APPROVAL",
                    deadline: validatedJobInput.deadline,
                    closedAt: null,
                    approvedAt: null,
                    rejectedAt: null,
                    rejectionReason: null,
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    requirement: true,
                    employmentType: true,
                    location: true,
                    deadline: true,
                    updatedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_UPDATED",
                targetId: jobId,
                message: JobUpdated(validatedJobInput.title, jobInfo.company.name),
                actor: currentUser,
            });

            return updated;
        });

        return {
            jobId: updatedJob.id,
            title: updatedJob.title,
            description: updatedJob.description,
            requirement: updatedJob.requirement,
            employmentType: updatedJob.employmentType,
            location: updatedJob.location,
            status: "PENDING_APPROVAL",
            deadline: updatedJob.deadline,
            updatedAt: updatedJob.updatedAt,
        }
    }

    public async closeJobPosting(
        currentUser: CurrentUser,
        jobId: string
    ): Promise<CloseJobPostingResponse> {
        // 1. Check whether user is an Employer
        assertEmployer(currentUser);

        // 2. Find job by id belonging to the company
        const jobInfo = await this.findOwnedJobs(currentUser, jobId);

        // 3. If the job posting have been closed, the user can't close it again
        if (jobInfo.status === "CLOSED") {
            throw new HttpError(409, "This job posting has already been closed.");
        }

        // 4. The user may only close ACTIVE jobs
        if (jobInfo.status !== "ACTIVE") {
            throw new HttpError(400, "Only an ACTIVE job posting can be closed.");
        }

        // 5. Update the job posting's information and write the audit log in one transaction
        const updatedJob = await prisma.$transaction(async (tx) => {
            const updated = await tx.job.update({
                where: {
                    id: jobId,
                },
                data: {
                    status: "CLOSED",
                    closedAt: new Date(),
                },
                select: {
                    id: true,
                    closedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_CLOSED",
                targetId: jobId,
                message: JobClosed(jobInfo.title, jobInfo.company.name),
                actor: currentUser,
            });

            return updated;
        });

        return {
            jobId: updatedJob.id,
            status: "CLOSED",
            closedAt: updatedJob.closedAt ?? new Date(),
            message: "Job posting closed successfully.",
        }
    }

    // Depending on the design decision, this function may not be used
    public async reopenJobPosting(
        currentUser: CurrentUser,
        jobId: string
    ): Promise<ReopenJobPostingResponse> {
        // 1. Check whether user is an Employer
        assertEmployer(currentUser);

        // 2. Find job by id belonging to the company
        const jobInfo = await this.findOwnedJobs(currentUser, jobId);

        // 3. Only a CLOSED job posting can be re-open
        if (jobInfo.status !== "CLOSED") {
            throw new HttpError(400, "Only a CLOSED job posting can be re-opened.")
        }

        // 4. The user need to update a new deadline before re-opening
        if (jobInfo.deadline <= new Date()) {
            throw new HttpError(400, "Update the deadline before re-opening this job posting.")
        }

        // 5. Update the job posting's information and write the audit log in one transaction
        const updatedJob = await prisma.$transaction(async (tx) => {
            // A note that this function won't update the deadline
            // since this use case is an extension of Update Job Posting
            // so the deadline will be updated by updateJobPosting()
            const updated = await tx.job.update({
                where: {
                    id: jobId,
                },
                data: {
                    status: "PENDING_APPROVAL",
                    closedAt: null,
                    approvedAt: null,
                    rejectedAt: null,
                    rejectionReason: null,
                },
                select: {
                    id: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_REOPENED",
                targetId: jobId,
                message: JobReopened(jobInfo.title, jobInfo.company.name),
                actor: currentUser,
            });

            return updated;
        });

        return {
            jobId: updatedJob.id,
            status: "PENDING_APPROVAL",
            message: "Re-open request have been sent to the Moderator."
        }
    }

    public async deleteJobPosting(
        currentUser: CurrentUser,
        jobId: string
    ): Promise<DeleteJobPostingResponse> {
        // 1. Check whether user is an Employer
        assertEmployer(currentUser);

        // 2. Find job by id belonging to the company
        const jobInfo = await this.findOwnedJobs(currentUser, jobId);

        // 3. If the job posting is already deleted, the user cannot delete it again
        if (jobInfo.status === "DELETED") {
            throw new HttpError(409, "This job posting has already been deleted.");
        }

        // 4. Update the job posting's information and write the audit log in one transaction
        const updatedJob = await prisma.$transaction(async (tx) => {
            const updated = await tx.job.update({
                where: {
                    id: jobId,
                },
                data: {
                    status: "DELETED",
                    deletedAt: new Date(),
                },
                select: {
                    id: true,
                    deletedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_DELETED",
                targetId: jobId,
                message: JobDeleted(jobInfo.title, jobInfo.company.name),
                actor: currentUser,
            });

            return updated;
        });

        return {
            jobId: updatedJob.id,
            status: "DELETED",
            deletedAt: updatedJob.deletedAt ?? new Date(),
            message: "Job posting deleted successfully.",
        }
    }
}
