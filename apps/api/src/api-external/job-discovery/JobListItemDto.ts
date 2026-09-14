import { EmploymentType } from '../../api-shared/type/EmploymentType';

export interface JobListItemDto {
    id: string;
    title: string;
    employmentType: EmploymentType;
    location: string;

    // UC-PUB-02 requires the company name beside every result. The service has
    // always selected it; the type omitted it, so it shipped in the JSON while
    // `swagger.json` never declared it and the generated client could not see it.
    company: {
        id: string;
        name: string;
    };
}
