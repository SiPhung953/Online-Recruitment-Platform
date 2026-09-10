import {
  Body,
  Controller,
  Patch,
  Get,
  Route,
  SuccessResponse,
  Tags,
  Security,
  Request, // This Request is a decorator, different from ExpressRequest
  UploadedFile,
} from "tsoa";
import { Request as ExpressRequest } from 'express';

import { ProfileService } from './ProfileService';

import { CurrentUser } from "../../security/CurrentAuthenticatedUser";
import { UpdateJobPreferencesRequest } from './UpdateJobPreferenceRequest';
import { UpdatePersonalInformationRequest } from './UpdatePersonalInformationRequest';
import { ChangePasswordRequest } from "./ChangePasswordRequest";
import { ChangePasswordResponse } from "./ChangePasswordResponse";

// Helper interface to extend tsoa's Request object
// Tsoa will automatically infer this when security is applied
interface AuthenticatedRequest extends ExpressRequest {
  currentUser: CurrentUser;
  // In the previous version, we have currentUser?: CurrentUser (currentUser may be undefined)
  // But since the controller is now protected by @Security("jwt")
  // We assume that authentication already succeeded (currentUser is always defined)
}

@Tags("Users")
@Route("users/me")
@Security("jwt")
export class ProfileController extends Controller {
  private readonly profileService = new ProfileService()

  @SuccessResponse("200", "OK")
  @Get("profile")
  public async getMyProfile(
    @Request() request: AuthenticatedRequest
  ) {
    const userId = request.currentUser!.id;
    return this.profileService.getMyProfile(userId);
  }

  @SuccessResponse("200", "OK") // Maybe 201 Created?
  @Patch("profile")
  public async updatePersonalInformation(
    @Request() request: AuthenticatedRequest,
    @Body() requestBody: UpdatePersonalInformationRequest
  ) {
    return this.profileService.updatePersonalInformation(request.currentUser, requestBody);
  }

  @SuccessResponse("200", "OK")
  @Get("job-preference")
  public async getJobPreference(
    @Request() request: AuthenticatedRequest
  ) {
    const userId = request.currentUser!.id;
    return this.profileService.getJobPreference(userId);
  }

  @SuccessResponse("200", "OK")
  @Patch("job-preference")
  public async updateJobPreference(
    @Request() request: AuthenticatedRequest,
    @Body() requestBody: UpdateJobPreferencesRequest
  ) {
    return this.profileService.updateJobPreference(request.currentUser, requestBody);
  }

  @SuccessResponse("200", "OK")
  @Patch("avatar")
  public async changeAvatar(
    @Request() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.changeAvatar(request.currentUser, file);
  }

  @SuccessResponse("200", "OK")
  @Patch("change-password")
  public async changePassword(
    @Request() request: AuthenticatedRequest,
    @Body() requestBody: ChangePasswordRequest
  ): Promise<ChangePasswordResponse> {
    return this.profileService.changePassword(request.currentUser, requestBody);
  }
}