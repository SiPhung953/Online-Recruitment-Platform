import { RecommendedJobDto } from './RecommendedJobDto';

/**
 * What the list actually represents, so the dashboard can say so honestly
 * instead of labelling everything "recommended".
 *
 * - `PREFERENCES` — ranked against the user's stated preferences.
 * - `LATEST`      — the user has set no preferences, so this is just the newest
 *                   postings and the UI should ask them to fill preferences in.
 * - `NOT_LOOKING` — the user set their status to Not Looking; `items` is empty
 *                   because recommending at them would ignore that.
 */
export type RecommendationBasis = "PREFERENCES" | "LATEST" | "NOT_LOOKING";

export interface GetRecommendationsResponse {
    items: RecommendedJobDto[];
    basis: RecommendationBasis;
}
