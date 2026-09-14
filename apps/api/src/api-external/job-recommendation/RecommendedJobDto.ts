import { EmploymentType } from '../../api-shared/type/EmploymentType';

export interface RecommendedJobDto {
    id: string;
    title: string;
    employmentType: EmploymentType;
    location: string;

    company: {
        id: string;
        name: string;
    };

    /** The utility score in [0, 1]. Zero when the list is not a ranked one. */
    score: number;

    /**
     * Why this job was recommended, in the user's own terms. Never empty for a
     * ranked result — a job the system cannot explain is not recommended.
     */
    reasons: string[];
}
