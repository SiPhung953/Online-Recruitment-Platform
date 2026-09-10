import {
    Controller,
    Request,
    SuccessResponse,
    Get,
    Tags,
    Route,
    Security
} from "tsoa"
import { Request as ExpressRequest } from 'express'
import { CurrentUser } from '../../security/CurrentAuthenticatedUser'
import { AuditLogListResponse } from './AuditLogListResponse';

import { AuditLogService } from './AuditLogService';

interface AuthenticatedRequest extends ExpressRequest {
    currentUser: CurrentUser;
}

@Tags("Back-Office Worker", "SysAdmin")
@Route("admin/logs")
@Security("jwt", ["ADMIN"])
export class AuditLogController extends Controller {
    private readonly auditLogService = new AuditLogService()

    @SuccessResponse(200, "OK")
    @Get()
    public async getAuditLogs(
        @Request() request: AuthenticatedRequest
    ): Promise<AuditLogListResponse> {
        this.setStatus(200)
        return this.auditLogService.getAuditLogs(request.currentUser)
    }
}