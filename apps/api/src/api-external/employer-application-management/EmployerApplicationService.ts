import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/HttpError';
import { assertEmployer } from '../../api-shared/guard/AssertRole';

import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { AuditLogger } from '../../logging/AuditLogger';
import { ApplicationUnderReview, ApplicationStatusUpdated } from '../../logging/LogMessages';
import { EmployerApplicationListResponse } from './EmployerApplicationListResponse';
import { EmployerApplicationResponse } from './EmployerApplicationResponse';
import { PutApplicationUnderReviewResponse } from './PutApplicationUnderReviewResponse';
import { UpdateApplicationStatusRequest } from './UpdateApplicationStatusRequest';
import { UpdateApplicationStatusResponse } from './UpdateApplicationStatusResponse';

export class EmployerApplicationService {
    private readonly auditLogger = new AuditLogger();

    // Helper function for querying owned application
    private async findOwnedApplication(
        currentUser: CurrentUser,
        applicationId: string
    ) {
        const application = await prisma.application.findUnique({
            where: {
                id: applicationId,
            },
            select: {
                id: true,
                status: true,
                appliedAt: true,
                underReviewAt: true,
                withdrawnAt: true,
                decidedAt: true,
                rejectionReason: true,
                updatedAt: true,
                user: {
                    select: {
                        email: true,
                        userProfile: {
                            select: {
                                fullName: true,
                                headline: true,
                                phoneNumber: true,
                                city: true,
                            },
                        },
                    },
                },
                resume: {
                    select: {
                        id: true,
                        title: true,
                        fileUrl: true,
                    },
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                        createdByEmployerId: true,
                    },
                },
            },
        });

        if (!application) {
            throw new HttpError(404, "Application not found.");
        }

        if (application.job.createdByEmployerId !== currentUser.id) {
            throw new HttpError(403, "You are not allowed to manage this application.");
        }

        return application;
    }

    public async getJobApplications(
        currentUser: CurrentUser,
        jobId: string
    ): Promise<EmployerApplicationListResponse> {
        // Note that this function get the short version of an application,
        // only enough to display on a card UI element.

        // 1. Assert current user is an employer
        assertEmployer(currentUser);

        // 2. Find the job posting
        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
            select: {
                createdByEmployerId: true,
            },
        });

        if (!job) {
            throw new HttpError(404, "Job posting not found.");
        }

        if (job.createdByEmployerId !== currentUser.id) {
            throw new HttpError(403, "You are not allowed to manage this job posting.");
        }

        // 3. Find all application sent to the job posting
        const application = await prisma.application.findMany({
            where: {
                jobId: jobId,
            },
            select: {
                id: true,
                status: true,
                appliedAt: true,
                user: {
                    select: {
                        email: true,
                        userProfile: {
                            select: {
                                fullName: true,
                            },
                        },
                    },
                },
                resume: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                appliedAt: "desc",
            },
        });

        // 4. Map application to items
        const items = application.map(application => ({
            applicationId: application.id,
            applicationStatus: application.status,
            appliedAt: application.appliedAt,
            candidateName: application.user.userProfile?.fullName || undefined,
            candidateEmail: application.user.email,
            resumeId: application.resume.id,
            resumeTitle: application.resume.title,
        }));

        return { items };
    }

    public async getJobApplicationDetail(
        currentUser: CurrentUser,
        applicationId: string,
    ): Promise<EmployerApplicationResponse> {
        // 1. Assert current user is an employer
        assertEmployer(currentUser);

        // 2. Find the application (and validate ownership)
        const application = await this.findOwnedApplication(currentUser, applicationId);

        // 3. Map to full response type
        return {
            applicationId: application.id,
            
            candidateName: application.user.userProfile?.fullName || application.user.email,
            candidateEmail: application.user.email,
            candidateHeadline: application.user.userProfile?.headline || undefined,
            candidatePhoneNumber: application.user.userProfile?.city || undefined,
            candidateCity: application.user.userProfile?.city || undefined,
            
            resumeId: application.resume?.id,
            resumeTitle: application.resume?.title,
            resumeFileUrl: application.resume?.fileUrl,

            jobId: application.job.id,
            jobTitle: application.job.title,
        
            applicationStatus:  application.status,
            appliedAt: application.appliedAt,
            underReviewAt: application.underReviewAt || undefined,
            withdrawnAt: application.withdrawnAt || undefined,
            decidedAt: application.decidedAt || undefined,
            rejectionReason: application.rejectionReason || undefined,
            updatedAt: application.updatedAt,
        };
    }

    public async putApplicationUnderReview(
        currentUser: CurrentUser,
        applicationId: string
    ): Promise<PutApplicationUnderReviewResponse> {
        // 1. Assert current user is an employer
        assertEmployer(currentUser);

        // 2. Find the application (and validate ownership)
        const application = await this.findOwnedApplication(currentUser, applicationId);

        // 3. Status gate for each case
        if (application.status === "WITHDRAWN") {
            throw new HttpError(409, "The candidate has withdrawn this application.");
        }
        if (application.status === "UNDER_REVIEW") {
            throw new HttpError(409, "This application is already under review.");
        }
        if (application.status === "ACCEPTED" || application.status === "REJECTED") {
            throw new HttpError(409, "This application has already been processed.");
        }
        if (application.status !== "SUBMITTED") {
            throw new HttpError(400, "Only a submitted application can be put under review.")
        }

        // 4. Update the application status and write the audit log in one transaction
        const reviewedApplication = await prisma.$transaction(async (tx) => {
            const updated = await tx.application.update({
                where: {
                    id: applicationId,
                },
                data: {
                    status: "UNDER_REVIEW",
                    underReviewAt: new Date(),
                },
            });

            await this.auditLogger.log(tx, {
                action: "APPLICATION_UNDER_REVIEW",
                targetId: applicationId,
                message: ApplicationUnderReview(application.job.title),
                actor: currentUser,
            });

            return updated;
        });

        // 5. Return
        return {
            applicationId: reviewedApplication.id,
            applicationStatus: "UNDER_REVIEW",
            underReviewAt: reviewedApplication.underReviewAt ?? new Date(),
            message: "This application has been put under review.",
        }
    }

    public async updateApplicationStatus(
        currentUser: CurrentUser,
        applicationId: string,
        requestBody: UpdateApplicationStatusRequest,
    ): Promise<UpdateApplicationStatusResponse> {
        // 1. Assert current user is an employer
        assertEmployer(currentUser);

        // 2. Find the application (and validate ownership)
        const application = await this.findOwnedApplication(currentUser, applicationId);

        // 3. Status gate for each case
        if (application.status === "WITHDRAWN") {
            throw new HttpError(409, "The candidate has withdrawn this application.");
        }
        if (application.status === "ACCEPTED" || application.status === "REJECTED") {
            throw new HttpError(409, "This application has already been processed.");
        }
        if (application.status !== "UNDER_REVIEW") {
            throw new HttpError(400, "Only an application under review can be accepted or rejected.");
        }

        // 4. Normalize rejectionReason if exist
        let trimmedReason: string | undefined;
        if (requestBody.decision === "REJECTED") {
            trimmedReason = requestBody.rejectionReason?.trim() || undefined;

            if (trimmedReason && trimmedReason.length > 1000) {
                throw new HttpError(400, "Reason too long.");
            }
        }

        // 5. Update database and write the audit log in one transaction
        const isRejected = requestBody.decision === "REJECTED";
        const updatedApplication = await prisma.$transaction(async (tx) => {
            const updated = await tx.application.update({
                where: {
                    id: applicationId,
                },
                data: {
                    status: requestBody.decision,
                    decidedAt: new Date(),
                    ...(isRejected && { rejectionReason: trimmedReason }),
                    // This is JS conditional spreading
                    // When isRejected = true, the expression will be resolved to { rejectionReason: trimmedReason }, and then spread by ...
                    // When isRejected = false, the expression will be evaluated to false, then spread into the data object, and the rejection reason will not be included.
                },
                select: {
                    id: true,
                    decidedAt: true,
                    rejectionReason: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "APPLICATION_STATUS_UPDATED",
                targetId: applicationId,
                message: ApplicationStatusUpdated(application.job.title, application.status, requestBody.decision),
                actor: currentUser,
            });

            return updated;
        });

        // 6. Return
        return {
            applicationId: updatedApplication.id,
            applicationStatus: requestBody.decision,
            decidedAt: updatedApplication.decidedAt ?? new Date(),
            rejectionReason: updatedApplication.rejectionReason || undefined,
            message: `Application ${isRejected ? "rejected" : "accepted"} successfully`,
        }
    }
}