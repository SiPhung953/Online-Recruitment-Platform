// AuditLogger is a cross-cutting infrastructure component.
// Definition: Cross Cutting Concern: a software concept, refer to something that affect multiple components and services.
// It has 2 purposes:
//  1) Create a structured log/audit for important system event.
//  2) Derive a complete, consistent audit entry from the action before persisting it (the caller never
//     supplies targetType or level, so a bad pairing cannot be written in the first place).

import { Prisma, LogAction, LogTargetType, LogLevel } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { AuditEntry } from './AuditEntry';

// Every action is paired with a target type and a level.
// These maps are where the pairing is DECIDED, not where it is "validated": the service passes only the
// action, and TARGET_TYPE[action] / LEVEL[action] derive the rest. A wrong pairing (e.g. USER_REGISTERED
// + SYSTEM) can't be supplied by the caller, because targetType and level are never inputs — they are
// derived. Record<LogAction, ...> also forces every member of the enum to appear here: adding a new
// LogAction without extending these maps is a compile error, not a missed runtime check.
const TARGET_TYPE: Record<LogAction, LogTargetType> = {
    // User / Authentication
    USER_REGISTERED: "AUTH",
    USER_LOGGED_IN: "AUTH",
    USER_LOGGED_OUT: "AUTH",
    USER_LOGIN_FAILED: "AUTH",
    USER_BANNED: "USER",
    USER_UNBANNED: "USER",
    PASSWORD_RESET_REQUESTED: "USER",
    PASSWORD_RESET_COMPLETED: "USER",
    PASSWORD_CHANGED: "USER",

    // Company
    COMPANY_CREATED: "COMPANY",
    COMPANY_UPDATED: "COMPANY",

    // Job
    JOB_CREATED: "JOB",
    JOB_UPDATED: "JOB",
    JOB_APPROVED: "JOB",
    JOB_REJECTED: "JOB",
    JOB_REOPENED: "JOB",
    JOB_CLOSED: "JOB",
    JOB_DELETED: "JOB",
    JOB_EXPIRED: "JOB",

    // Application
    APPLICATION_SUBMITTED: "APPLICATION",
    APPLICATION_UNDER_REVIEW: "APPLICATION",
    APPLICATION_STATUS_UPDATED: "APPLICATION",
    APPLICATION_WITHDRAWN: "APPLICATION",

    // Resume
    RESUME_UPLOADED: "RESUME",
    RESUME_DELETED: "RESUME",

    // Profile
    PROFILE_UPDATED: "USER",
    AVATAR_CHANGED: "USER",
    JOB_PREFERENCE_UPDATED: "USER",

    // System
    SYSTEM_ERROR: "SYSTEM",
}

const LEVEL: Record<LogAction, LogLevel> = {
    // User / Authentication
    USER_REGISTERED: "INFO",
    USER_LOGGED_IN: "INFO",
    USER_LOGGED_OUT: "INFO",
    USER_LOGIN_FAILED: "WARN",
    USER_BANNED: "WARN",
    USER_UNBANNED: "INFO",
    PASSWORD_RESET_REQUESTED: "INFO",
    PASSWORD_RESET_COMPLETED: "INFO",
    PASSWORD_CHANGED: "INFO",

    // Company
    COMPANY_CREATED: "INFO",
    COMPANY_UPDATED: "INFO",

    // Job
    JOB_CREATED: "INFO",
    JOB_UPDATED: "INFO",
    JOB_APPROVED: "INFO",
    JOB_REJECTED: "INFO",
    JOB_REOPENED: "INFO",
    JOB_CLOSED: "INFO",
    JOB_DELETED: "INFO",
    JOB_EXPIRED: "INFO",

    // Application
    APPLICATION_SUBMITTED: "INFO",
    APPLICATION_UNDER_REVIEW: "INFO",
    APPLICATION_STATUS_UPDATED: "INFO",
    APPLICATION_WITHDRAWN: "INFO",

    // Resume
    RESUME_UPLOADED: "INFO",
    RESUME_DELETED: "INFO",

    // Profile
    PROFILE_UPDATED: "INFO",
    AVATAR_CHANGED: "INFO",
    JOB_PREFERENCE_UPDATED: "INFO",

    // System
    SYSTEM_ERROR: "ERROR",
}

export class AuditLogger {
    public async log(
        tx: Prisma.TransactionClient,
        entry: AuditEntry
    ): Promise<void> {
        await tx.log.create({
            data: {
                action: entry.action,
                targetId: entry.targetId,
                message: entry.message,
                actorId: entry.actor?.id ?? null,
                targetType: TARGET_TYPE[entry.action],
                level: LEVEL[entry.action],
            },
        });
    }

    // For events that have no system write to pair with (e.g. login) —
    // the log is the only write, but it must still commit as its own unit.
    public async logStandalone(entry: AuditEntry): Promise<void> {
        await prisma.$transaction((tx) => this.log(tx, entry));
    }
}