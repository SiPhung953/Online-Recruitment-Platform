import { HttpError } from '../../utils/HttpError';
import { RoleConstant } from '../constant/RoleConstant';
import { CurrentUser } from '../../security/CurrentAuthenticatedUser';

function assertRole(
    currentUser: CurrentUser,
    expectedRole: RoleConstant,
    message: string
): void {
    if (currentUser?.roleId !== expectedRole) {
        throw new HttpError(403, message);
    }
}

export function assertJobSeeker(currentUser: CurrentUser): void {
    assertRole(
        currentUser,
        RoleConstant.JOB_SEEKER,
        "Only Job Seekers can perform this action."
    );
}

export function assertEmployer(currentUser: CurrentUser): void {
    assertRole(
        currentUser,
        RoleConstant.EMPLOYER,
        "Only Employer can perform this action."
    )
}

export function assertAdmin(currentUser: CurrentUser): void {
    assertRole(
        currentUser,
        RoleConstant.ADMIN,
        "Only Admin can perform this action."
    )
}