import { prisma } from '../../lib/prisma';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { assertAdmin } from '../../api-shared/guard/AssertRole';

import { AuditLogListResponse } from './AuditLogListResponse';

export class AuditLogService {
    public async getAuditLogs(currentUser: CurrentUser): Promise<AuditLogListResponse> {
        // 1. Check whether user is an Admin
        assertAdmin(currentUser);

        // 2. Find all logs
        const logs = await prisma.log.findMany({
            select: {
                id: true,
                actorId: true,
                action: true,
                targetId: true,
                targetType: true,
                level: true,
                message: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 50
        });

        // 3. Map logs info to array
        const items = logs.map(log => ({
            logId: log.id,
            actorId: log.actorId ?? undefined,
            action: log.action,
            targetId: log.targetId ?? undefined,
            targetType: log.targetType,
            level: log.level,
            message: log.message,
            createdAt: log.createdAt,
        }));

        return { items };
    }
}