import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/HttpError';

import { SearchJobsQuery } from './SearchJobsQuery';
import { SearchJobsResponse } from './SearchJobsResponse';
import { GetJobDetailResponse } from './GetJobDetailResponse';

export class JobDiscoveryService {
    public async searchJobs(query: SearchJobsQuery): Promise<SearchJobsResponse> {
        // 1. User may provide keyword only, location only, or both.
            // This is important since the current search bar have 2 fields. 
            // And the users should be able to query either of those.
            // When either is provided: search by keyword if keyword is provided, search by location if location is provided. 
            // When both are provided:  search jobs that match keyword AND location.
            // It is the controller's job to take in the query
        
        // 2. Normalize, validate query values
            // Empty string will be treated as undefined.
            // Invalid enum values or too long input should be rejected.

        // 3. Query Prisma on criteria:
            // Restrict public results to ACTIVE jobs only.
            // Then we check on input (keyword and or location)
                // keyword matches job title OR company name
                // location matches location matches job location OR company city OR company district
                // if both keyword and location exist, both group must match. 

        // 4. If underfined (no keyword/location provided):
            // return ACTIVE jobs

        // 5. If no jobs match criteria/a valid query:
            // return empty list with success code

        const rawKeyword = query.keyword?.trim();
        const rawLocation = query.location?.trim();

        const keyword = rawKeyword === "" ? undefined : rawKeyword;
        const location = rawLocation === "" ? undefined : rawLocation;

        if (keyword && keyword.length > 255) {
            throw new HttpError(400, "Keyword cannot exceed 255 characters.");
        }

        if (location && location.length > 255) {
            throw new HttpError(400, "Location cannot exceed 255 characters.");
        }

        const whereClause: any = {
            status: 'ACTIVE',
            // A posting past its deadline is expired whether or not the sweep
            // has written the status yet, so the rule is checked on every read
            // rather than trusted from the stored value (UC-EMP-01).
            deadline: { gt: new Date() },
        };

        const conditions: any[] = [];

        if (keyword) {
            conditions.push({
                OR: [
                    {
                        title: {
                            contains: keyword,
                            mode: 'insensitive',
                        },
                    },
                    {
                        company: {
                            name: {
                                contains: keyword,
                                mode: 'insensitive',
                            },
                        },
                    },
                ],
            });
        }

        if (location) {
            conditions.push({
                OR: [
                    {
                        location: {
                            contains: location,
                            mode: 'insensitive',
                        },
                    },
                    {
                        company: {
                            city: {
                                contains: location,
                                mode: 'insensitive',
                            },
                        },
                    },
                    {
                        company: {
                            district: {
                                contains: location,
                                mode: 'insensitive',
                            },
                        },
                    },
                ],
            });
        }

        if (conditions.length > 0) {
            whereClause.AND = conditions;
        }

        const jobs = await prisma.job.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                employmentType: true,
                location: true,

                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return {
            items: jobs,
        };
    }

    public async getJobDetail(
        jobId: string
    ): Promise<GetJobDetailResponse> {
        const job = await prisma.job.findFirst({
            where: {
                id: jobId,
                status: "ACTIVE",
                deadline: { gt: new Date() },
            },
            select: {
                id: true,
                title: true,
                description: true,
                requirement: true,
                location: true,
                employmentType: true,
                deadline: true,

                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if(!job){
            throw new HttpError(404, "Job not found");
        }

        return job;
    }
}