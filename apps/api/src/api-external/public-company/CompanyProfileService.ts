import { CompanyProfileResponse } from './CompanyProfileResponse';
import { CompanyProfileDto } from './CompanyProfileDto';
import { CompanyJobListItemDto } from './CompanyJobListItemDto';

import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/HttpError';

export class CompanyProfileService {
    public async getCompanyProfile(companyId: string): Promise<CompanyProfileResponse> {
        // 1. Search company by id
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        // 2. If company does not exist, throw 404
        if (!company) {
            throw new HttpError(404, "Not Found")
        }

        // 3. if company exist, return company profile
        // Note that CompanyProfileResponse take 2 DTOs
        const companyProfile: CompanyProfileDto = {
            id: company.id,
            name: company.name,
            city: company.city,
            district: company.district,
            description: company.description
        };

        // 4. then return Job Posting associated with the company
        // where status = ACTIVE
        // if no ACTIVE job exist, return empty list []
        const activeJobs: CompanyJobListItemDto[] = await prisma.job.findMany({
            where: {
                companyId: companyId,
                status: 'ACTIVE',
                deadline: { gt: new Date() },
            },
            select: {
                id: true,
                title: true,
                employmentType: true,
                location: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        return {
            company: companyProfile,
            jobs: activeJobs
        };
    }
}