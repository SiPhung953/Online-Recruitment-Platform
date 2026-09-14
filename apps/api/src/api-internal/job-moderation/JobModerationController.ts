import { 
    Controller,
    Path,
    Request,
    Route,
    Security,
    SuccessResponse,
    Get,
    Tags, 
    Patch,
    Body,
    Query
} from "tsoa"
import { Request as ExpressRequest } from 'express';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { JobStatus } from '../../api-shared/type/JobStatus';

import { JobModerationService } from './JobModerationService';
import { ModerationJobListResponse } from './ModerationJobListResponse';
import { ModerationJobDetailResponse } from './ModerationJobDetailResponse';
import { ApproveJobResponse } from './ApproveJobResponse';
import { RejectJobRequest } from './RejectJobRequest';
import { RejectJobResponse } from './RejectJobResponse';
import { DeleteJobRequest } from './DeleteJobRequest';
import { DeleteJobResponse } from './DeleteJobResponse';

interface AuthenticatedRequest extends ExpressRequest {
    currentUser: CurrentUser
}

@Tags("Back-Office Worker", "Moderator")
@Route("admin/jobs")
@Security("jwt", ["ADMIN"])
export class JobModerationController extends Controller {
    private readonly jobModerationService = new JobModerationService()

    @SuccessResponse(200, "OK")
    @Get()
    public async getModerationJobs(
        @Request() request: AuthenticatedRequest,
        @Query() status?: JobStatus
    ): Promise<ModerationJobListResponse> {
        this.setStatus(200)
        return this.jobModerationService.getModerationJobs(request.currentUser, status)
    }

    @SuccessResponse(200, "OK")
    @Get("{jobId}")
    public async getModerationJobDetail(
        @Request() request: AuthenticatedRequest,
        @Path("jobId") jobId: string
    ): Promise<ModerationJobDetailResponse> {
        this.setStatus(200)
        return this.jobModerationService.getModerationJobDetail(request.currentUser, jobId)
    }

    @SuccessResponse(200, "OK")
    @Patch("{jobId}/approve")
    public async approveJobPosting(
        @Request() request: AuthenticatedRequest,
        @Path("jobId") jobId: string
    ): Promise<ApproveJobResponse> {
        this.setStatus(200)
        return this.jobModerationService.approveJobPosting(request.currentUser, jobId)
    }

    @SuccessResponse(200, "OK")
    @Patch("{jobId}/reject")
    public async rejectJobPosting(
        @Request() request: AuthenticatedRequest,
        @Path("jobId") jobId: string,
        @Body() requestBody: RejectJobRequest
    ): Promise<RejectJobResponse> {
        this.setStatus(200)
        return this.jobModerationService.rejectJobPosting(request.currentUser, jobId, requestBody)
    }

    @SuccessResponse(200, "OK")
    @Patch("{jobId}/delete")
    public async removeJobPosting(
        @Request() request: AuthenticatedRequest,
        @Path("jobId") jobId: string,
        @Body() requestBody: DeleteJobRequest
    ): Promise<DeleteJobResponse> {
        this.setStatus(200)
        return this.jobModerationService.deleteJobPosting(request.currentUser, jobId, requestBody)
    }
}