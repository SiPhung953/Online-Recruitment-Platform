import {
    Controller,
    Get,
    Request,
    Route,
    Security,
    SuccessResponse,
    Tags,
} from "tsoa";
import { Request as ExpressRequest } from 'express';

import { RecommendationService } from './RecommendationService';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { GetRecommendationsResponse } from './GetRecommendationsResponse';

interface AuthenticatedRequest extends ExpressRequest {
    currentUser: CurrentUser;
}

@Tags("Jobs")
@Route("recommendations")
@Security("jwt", ["JOB_SEEKER"])
export class RecommendationController extends Controller {
    private readonly recommendationService = new RecommendationService();

    @SuccessResponse(200, "OK")
    @Get()
    public async getRecommendations(
        @Request() request: AuthenticatedRequest
    ): Promise<GetRecommendationsResponse> {
        this.setStatus(200);
        return this.recommendationService.getRecommendations(request.currentUser);
    }
}
