import { EmploymentType } from '../../api-shared/type/EmploymentType';
import { JobStatus } from '../../api-shared/type/JobStatus';

export interface ModerationJobDetailResponse {
    jobId: string;
    title: string;
    description: string;
    requirement: string;
    employmentType: EmploymentType;
    location: string;
    status: JobStatus;
    deadline: Date;
    createdAt: Date;
    updatedAt: Date;
    approvedAt?: Date;
    deletedAt?: Date;
    deletionReason?: string;
    rejectedAt?: Date;
    rejectionReason?: string;

    companyId: string;
    companyName: string;
}