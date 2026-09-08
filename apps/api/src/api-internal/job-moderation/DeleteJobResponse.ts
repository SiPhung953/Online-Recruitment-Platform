export interface DeleteJobResponse {
    jobId: string;
    status: "DELETED";
    deletedAt: Date;
    deletionReason?: string;
    message: string;
}