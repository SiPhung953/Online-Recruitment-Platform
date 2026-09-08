export interface RejectJobResponse {
    jobId: string;
    status: "REJECTED";
    rejectionReason: string;
    rejectedAt: Date;
    message: string;
}