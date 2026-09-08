export interface ApproveJobResponse {
    jobId: string;
    status: "ACTIVE";
    approvedAt: Date;
    message: string;
}