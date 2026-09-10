import { UserStatus } from '../../api-shared/type/UserStatus';

export interface UserDetailResponse {
    userId: string;
    email: string;
    roleId: number;
    status: UserStatus;
    createdAt: Date;
    fullName: string | null;
    phoneNumber: string | null;
    avatarUrl: string | null;
    headline: string | null;
    profileUpdatedAt: Date | null;
    profileVisibility: "PRIVATE" | "VISIBLE_TO_EMPLOYERS";
    jobSearchStatus: "OPEN_TO_WORK" | "NOT_LOOKING";
    desiredJobTitle: string | null;
    preferredLocation: string | null;
}