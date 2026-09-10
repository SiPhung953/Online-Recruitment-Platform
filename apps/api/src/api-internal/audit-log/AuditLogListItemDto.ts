import { LogAction, LogLevel, LogTargetType } from '../../generated/prisma/enums';

export interface AuditLogListItemDto {
    logId: string;
    actorId?: string;
    action: LogAction;
    targetId?: string;
    targetType: LogTargetType;
    level: LogLevel;
    message: string;
    createdAt: Date;
}