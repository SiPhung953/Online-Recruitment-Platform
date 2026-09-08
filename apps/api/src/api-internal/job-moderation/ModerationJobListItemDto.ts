import { JobStatus } from '../../api-shared/type/JobStatus';

export interface ModerationJobListItemDto {
    jobId: string;
    title: string;
    companyId: string;
    companyName: string;
    status: JobStatus;
    deadline: Date;
    createdAt: Date;
}