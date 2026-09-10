import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/HttpError';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { assertAdmin } from '../../api-shared/guard/AssertRole';

import { AuditLogger } from '../../logging/AuditLogger';
import { UserBanned, UserUnbanned } from '../../logging/LogMessages';

import { UserListResponse } from './UserListResponse';
import { UserDetailResponse } from './UserDetailResponse';
import { BanUserResponse } from './BanUserResponse';
import { UnbanUserResponse } from './UnbanUserResponse';

export class UserManagementService {
    private readonly auditLogger = new AuditLogger();

    public async getUsers(
        currentUser: CurrentUser,
        email?: string
    ): Promise<UserListResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find all users, optionally filtered by email (case-insensitive contains)
        const users = await prisma.user.findMany({
            where: {
                // email query is later mapped to { contains, mode } by Prisma
                email: email ? {
                    contains: email.trim(),
                    mode: "insensitive",
                } : undefined,
            },
            take: 100,
            select: {
                id: true,
                email: true,
                roleId: true,
                status: true,
                createdAt: true,
                userProfile: {
                    select: {
                        fullName: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // 3. Map user and profile info to array
        const items = users.map(user => ({
            userId: user.id,
            email: user.email,
            fullName: user.userProfile?.fullName ?? null,
            roleId: user.roleId,
            status: user.status,
            createdAt: user.createdAt,
        }));

        return { items };
    }

    public async getUserDetail(
        currentUser: CurrentUser,
        userId: string
    ): Promise<UserDetailResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find user by id with profile and job preference
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                email: true,
                roleId: true,
                status: true,
                createdAt: true,
                userProfile: {
                    select: {
                        fullName: true,
                        phoneNumber: true,
                        avatarUrl: true,
                        headline: true,
                        updatedAt: true,
                    },
                },
                userJobPreference: {
                    select: {
                        profileVisibility: true,
                        jobSearchStatus: true,
                        desiredJobTitle: true,
                        preferredLocation: true,
                    },
                },
            },
        });

        // 3. If user does not exist
        if (!user) {
            throw new HttpError(404, "User does not exist.");
        }

        return {
            userId: user.id,
            email: user.email,
            roleId: user.roleId,
            status: user.status,
            createdAt: user.createdAt,
            fullName: user.userProfile?.fullName ?? null,
            phoneNumber: user.userProfile?.phoneNumber ?? null,
            avatarUrl: user.userProfile?.avatarUrl ?? null,
            headline: user.userProfile?.headline ?? null,
            profileUpdatedAt: user.userProfile?.updatedAt ?? null,
            profileVisibility: user.userJobPreference?.profileVisibility ?? "VISIBLE_TO_EMPLOYERS",
            jobSearchStatus: user.userJobPreference?.jobSearchStatus ?? "OPEN_TO_WORK",
            desiredJobTitle: user.userJobPreference?.desiredJobTitle ?? null,
            preferredLocation: user.userJobPreference?.preferredLocation ?? null,
        };
    }

    public async banUser(
        currentUser: CurrentUser,
        userId: string
    ): Promise<BanUserResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Back-Office Worker cannot ban their own account
        if (currentUser.id === userId) {
            throw new HttpError(403, "You cannot ban your own account.");
        }

        // 3. Find user by id
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                email: true,
                status: true,
            },
        });

        // 4.1. If user does not exist
        if (!user) {
            throw new HttpError(404, "User does not exist.");
        };

        // 4.2. If user is already BANNED
        if (user.status === "BANNED") {
            throw new HttpError(409, "This account is already banned.")
        };

        // 5. Update user status and write the audit log in one transaction
        const bannedUser = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: {
                    id: userId,
                },
                data: {
                    status: "BANNED",
                },
                select: {
                    id: true,
                    updatedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "USER_BANNED",
                targetId: userId,
                message: UserBanned(user.email),
                actor: currentUser,
            });

            return updated;
        });

        return {
            userId: bannedUser.id,
            status: "BANNED",
            bannedAt: bannedUser.updatedAt || new Date(),
            message: "Account banned successfully."
        };
    }

    public async unbanUser(
        currentUser: CurrentUser,
        userId: string
    ): Promise<UnbanUserResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find user by id
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                email: true,
                status: true,
            },
        });

        // 3.1. If user does not exist
        if (!user) {
            throw new HttpError(404, "User does not exist.");
        };

        // 3.2. If user is not BANNED
        if (user.status !== "BANNED") {
            throw new HttpError(409, "This account is not banned.")
        };

        // 4. Update user status and write the audit log in one transaction
        const unbannedUser = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: {
                    id: userId,
                },
                data: {
                    status: "ACTIVE",
                },
                select: {
                    id: true,
                    updatedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "USER_UNBANNED",
                targetId: userId,
                message: UserUnbanned(user.email),
                actor: currentUser,
            });

            return updated;
        });

        return {
            userId: unbannedUser.id,
            status: "ACTIVE",
            unbannedAt: unbannedUser.updatedAt || new Date(),
            message: "Account unbanned successfully."
        };
    }
}