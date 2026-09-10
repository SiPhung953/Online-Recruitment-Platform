import {
    Controller,
    Request,
    Route,
    Security,
    SuccessResponse,
    Get,
    Patch,
    Tags,
    Query,
    Path,
} from "tsoa"
import { Request as ExpressRequest } from 'express';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';

import { UserManagementService } from './UserManagementService';
import { UserListResponse } from './UserListResponse';
import { UserDetailResponse } from './UserDetailResponse';
import { BanUserResponse } from './BanUserResponse';
import { UnbanUserResponse } from './UnbanUserResponse';

interface AuthenticatedRequest extends ExpressRequest {
    currentUser: CurrentUser
}

@Tags("Back-Office Worker", "Moderator")
@Route("admin/users")
@Security("jwt", ["ADMIN"])
export class UserManagementController extends Controller {
    private readonly userManagementService = new UserManagementService()

    @SuccessResponse(200, "OK")
    @Get()
    public async getUsers(
        @Request() request: AuthenticatedRequest,
        @Query() email?: string
    ): Promise<UserListResponse> {
        this.setStatus(200)
        return this.userManagementService.getUsers(request.currentUser, email)
    }

    @SuccessResponse(200, "OK")
    @Get("{userId}")
    public async getUserDetail(
        @Request() request: AuthenticatedRequest,
        @Path("userId") userId: string
    ): Promise<UserDetailResponse> {
        this.setStatus(200)
        return this.userManagementService.getUserDetail(request.currentUser, userId)
    }

    @SuccessResponse(200, "OK")
    @Patch("{userId}/ban")
    public async banUser(
        @Request() request: AuthenticatedRequest,
        @Path("userId") userId: string
    ): Promise<BanUserResponse> {
        this.setStatus(200)
        return this.userManagementService.banUser(request.currentUser, userId)
    }

    @SuccessResponse(200, "OK")
    @Patch("{userId}/unban")
    public async unbanUser(
        @Request() request: AuthenticatedRequest,
        @Path("userId") userId: string
    ): Promise<UnbanUserResponse> {
        this.setStatus(200)
        return this.userManagementService.unbanUser(request.currentUser, userId)
    }
}