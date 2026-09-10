export interface UnbanUserResponse {
    userId: string;
    status: "ACTIVE";
    unbannedAt: Date;
    message: string;
}