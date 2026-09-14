import { EmploymentType } from '../../api-shared/type/EmploymentType';

export interface GetJobDetailResponse {
    id: string;
    title: string;
    description: string;
    requirement: string;
    location: string;
    employmentType: EmploymentType;
    // A Date here, not a string: the service returns the Prisma row directly.
    // tsoa serialises it to an ISO string in the spec, so the generated client
    // still sees `string`.
    deadline: Date;

    company: {
        id: string;
        name: string;
    };
}
