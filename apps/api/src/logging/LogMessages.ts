// Log.message is the human-readable text a moderator reads in the Admin log list (UC-ADMIN-05)
// Each message template below is rendered by its own builder function at the call site.

export function UserRegistered(): string {
    return `Registered as Job Seeker.`;
}

export function UserLoggedIn(): string {
    return `Logged in.`;
}

export function UserLoggedOut(): string {
    return `Logged out.`;
}

export function UserLoginFailed(userEmail: string): string {
    return `Failed login attempt for ${userEmail}.`;
}

export function UserBanned(userEmail: string): string {
    return `Banned account ${userEmail}.`;
}

export function UserUnbanned(userEmail: string): string {
    return `Unbanned account ${userEmail}.`;
}

export function PasswordResetRequested(userEmail: string): string {
    return `Password reset requested for ${userEmail}.`;
}

export function PasswordResetCompleted(userEmail: string): string {
    return `Password reset completed for ${userEmail}.`;
}

export function PasswordChanged(userEmail: string): string {
    return `Password changed for ${userEmail}.`;
}

export function CompanyCreated(companyName: string): string {
    return `Created company "${companyName}".`;
}

export function CompanyUpdated(companyName: string): string {
    return `Updated company "${companyName}".`;
}

export function JobCreated(jobTitle: string, companyName: string): string {
    return `Created job posting "${jobTitle}" for company ${companyName}.`;
}

export function JobUpdated(jobTitle: string, companyName: string): string {
    return `Updated job posting "${jobTitle}" for company ${companyName}.`;
}

export function JobApproved(jobTitle: string, companyName: string): string {
    return `Approved job posting "${jobTitle}" for company ${companyName}.`;
}

export function JobRejected(jobTitle: string, companyName: string, reason: string): string {
    return `Rejected job posting "${jobTitle}" for company ${companyName}. Reason ${reason}.`;
}

export function JobReopened(jobTitle: string, companyName: string): string {
    return `Reopened job posting "${jobTitle}" for company ${companyName}.`;
}

export function JobClosed(jobTitle: string, companyName: string): string {
    return `Closed job posting "${jobTitle}" for company ${companyName}.`;
}

export function JobDeleted(jobTitle: string, companyName: string, reason?: string): string {
    return reason
        ? `Deleted job posting "${jobTitle}" for company ${companyName}. Reason ${reason}.`
        : `Deleted job posting "${jobTitle}" for company ${companyName}.`;
}

export function JobExpired(jobTitle: string, companyName: string): string {
    return `Expired job posting "${jobTitle}" for company ${companyName}.`;
}

export function ApplicationSubmitted(jobTitle: string): string {
    return `Application for job "${jobTitle}" submitted.`;
}

export function ApplicationUnderReview(jobTitle: string): string {
    return `Application for job "${jobTitle}" under review.`;
}

export function ApplicationStatusUpdated(jobTitle: string, oldStatus: string, newStatus: string): string {
    return `Application for job "${jobTitle}" status updated from ${oldStatus} to ${newStatus}.`;
}

export function ApplicationWithdrawn(jobTitle: string): string {
    return `Application for job "${jobTitle}" withdrawn.`;
}

export function ResumeUploaded(resumeName: string): string {
    return `Resume "${resumeName}" uploaded.`;
}

export function ResumeDeleted(resumeName: string): string {
    return `Resume "${resumeName}" deleted.`;
}

export function ProfileUpdated(): string {
    return `Profile updated.`;
}

export function AvatarChanged(): string {
    return `Avatar changed.`;
}

export function JobPreferenceUpdated(): string {
    return `Job preference updated.`;
}

export function SystemError(message: string, source: string): string {
    return `${message} (${source})`;
}