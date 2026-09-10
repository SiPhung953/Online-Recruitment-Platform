export interface BanUserResponse {
    userId: string;
    status: "BANNED";
    bannedAt: Date;
    message: string;
}