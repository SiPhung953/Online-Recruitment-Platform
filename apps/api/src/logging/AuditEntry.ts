import { LogAction } from '../generated/prisma/enums';
import { CurrentUser } from '../security/CurrentAuthenticatedUser';

export interface AuditEntry {
    action: LogAction;
    targetId: string | null // What the event is about, null for events with no subject
    message: string // Human readable text defined in LogMessages
    actor: CurrentUser | null // Who dunnit, null for anonymous events
}