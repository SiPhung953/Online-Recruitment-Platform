import { UserStatus } from '../../api-shared/type/UserStatus';

export interface UserListItemDto {
    userId: string;
    email: string;
    fullName: string | null;
    roleId: number;
    status: UserStatus;
    createdAt: Date;
}