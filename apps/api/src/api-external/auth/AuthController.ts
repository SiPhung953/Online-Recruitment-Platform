import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Route,
  SuccessResponse,
  Tags,
  Security,
  Request,
} from "tsoa";
import { Request as ExpressRequest } from "express";
import { AuthService } from "./AuthService";
import { CurrentUser } from "../../security/CurrentAuthenticatedUser";

// Helper interface to extend tsoa's Request object
// We assume that authentication already succeeded (currentUser is always defined)
interface AuthenticatedRequest extends ExpressRequest {
    currentUser: CurrentUser;
}

import { LoginRequest } from "./LoginRequest";
import { LoginResponse } from "./LoginResponse";
import { RegisterRequest } from "./RegisterRequest";
import { RegisterResponse } from "./RegisterResponse";
import { LogoutResponse } from "./LogoutResponse";
import { ForgotPasswordRequest } from "./ForgotPasswordRequest";
import { ForgotPasswordResponse } from "./ForgotPasswordResponse";
import { ResetPasswordRequest } from "./ResetPasswordRequest";
import { ResetPasswordResponse } from "./ResetPasswordResponse";

@Tags("Auth")
@Route("auth")
export class AuthController extends Controller {
    private readonly authService = new AuthService();

    @SuccessResponse("200", "OK")
    @Post("login")
    public async authenticateUser(
        @Body() requestBody: LoginRequest
    ): Promise<LoginResponse> {
        this.setStatus(200);
        return this.authService.login(requestBody);
    }

    @SuccessResponse("201", "Created")
    @Post("register")
    public async registerUser(
        @Body() requestBody: RegisterRequest
    ): Promise<RegisterResponse> {
        this.setStatus(201);
        return this.authService.register(requestBody);
    }

    @SuccessResponse("200", "OK")
    @Post("logout")
    @Security("jwt")
    public async logoutUser(
        @Request() request: AuthenticatedRequest
    ): Promise<LogoutResponse> {
        this.setStatus(200);
        return this.authService.logout(request.currentUser);
    }

    @SuccessResponse("200", "OK")
    @Post("forgot-password")
    public async requestPasswordReset(
        @Body() requestBody: ForgotPasswordRequest
    ): Promise<ForgotPasswordResponse> {
        this.setStatus(200);
        return this.authService.requestPasswordReset(requestBody);
    }

    @SuccessResponse("200", "OK")
    @Post("reset-password")
    public async resetPassword(
        @Body() requestBody: ResetPasswordRequest
    ): Promise<ResetPasswordResponse> {
        this.setStatus(200);
        return this.authService.resetPassword(requestBody);
    }

    @SuccessResponse("200", "OK")
    @Get("reset-password/validate")
    public async validateResetToken(
        @Query() token: string
    ): Promise<{ valid: boolean }> {
        return this.authService.validateResetToken(token);
    }
}
