
import { prisma } from '../../lib/prisma';
import { PasswordHasher } from '../../utils/PasswordHasher';
import { HttpError } from '../../utils/HttpError';

import { CurrentUser } from '../../security/CurrentAuthenticatedUser';
import { AuditLogger } from '../../logging/AuditLogger';
import { ProfileUpdated, JobPreferenceUpdated, AvatarChanged, PasswordChanged } from '../../logging/LogMessages';

import { UpdateJobPreferencesRequest } from './UpdateJobPreferenceRequest';
import { UpdatePersonalInformationRequest } from './UpdatePersonalInformationRequest';
import { UpdatePersonalInformationResponse } from './UpdatePersonalInformationResponse';
import { UpdateJobPreferencesResponse } from './UpdateJobPreferenceResponse';
import { ChangePasswordResponse } from './ChangePasswordResponse';
import { ChangePasswordRequest } from './ChangePasswordRequest';
import { FileStorageService } from '../../utils/FileStorageService';
import { ChangeAvatarResponse } from './ChangeAvatarResponse';

export class ProfileService {
    private readonly passwordHasher = new PasswordHasher();
    private readonly fileStorageService = new FileStorageService();
    private readonly auditLogger = new AuditLogger();

    public async getMyProfile(userId: string) {
        const profile = await prisma.userProfile.findUnique({
            // 1. Find user by Id
            where: { userId },
            // 2. Only select fields that need to be displayed
            // Those field can be empty, as the user have yet to update them
            select: {
                fullName: true,
                dateOfBirth: true,
                headline: true,
                phoneNumber: true,
                city: true,
                summary: true,
                avatarUrl: true,
                updatedAt: true,
            },
        });
        return {
            profile,
        };
    }

    public async updatePersonalInformation(
        currentUser: CurrentUser,
        requestBody: UpdatePersonalInformationRequest
    ): Promise<UpdatePersonalInformationResponse> {
        // upsert is the equivalent of PATCH
        // where we can either: update if existed or create if not existed
        const profile = await prisma.$transaction(async (tx) => {
            const result = await tx.userProfile.upsert({
                // 1. Find user by Id
                where: { userId: currentUser.id },
                // 2.1. Update user profile if existed
                // As in, they have update their profile before/they have created their profile
                update: {
                    fullName: requestBody.fullName,
                    dateOfBirth: requestBody.dateOfBirth,
                    headline: requestBody.headline,
                    phoneNumber: requestBody.phoneNumber,
                    city: requestBody.city,
                    summary: requestBody.summary,
                },
                // 2.2. Create user profile if not existed
                create: {
                    userId: currentUser.id,
                    fullName: requestBody.fullName,
                    dateOfBirth: requestBody.dateOfBirth,
                    headline: requestBody.headline,
                    phoneNumber: requestBody.phoneNumber,
                    city: requestBody.city,
                    summary: requestBody.summary,
                },
                // Only update/create the field needed to be
                // Once again, normal user can't modify date/logs stuff 
                select: {
                    fullName: true,
                    dateOfBirth: true,
                    headline: true,
                    phoneNumber: true,
                    city: true,
                    summary: true,
                    updatedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "PROFILE_UPDATED",
                targetId: currentUser.id,
                message: ProfileUpdated(),
                actor: currentUser,
            });

            return result;
        });
        return {
            message: "Profile Updated Successfully",
            userProfile: profile,
        };
    }

    public async getJobPreference(userId: string) {
        const preference = await prisma.userJobPreference.findUnique({
            // Rinse and repeat
            where: { userId },
            select: {
                profileVisibility: true,
                jobSearchStatus: true,
                desiredJobTitle: true,
                preferredLocation: true,
            },
        });
        return {
            preference,
        };
    }

    public async updateJobPreference(
        currentUser: CurrentUser,
        requestBody: UpdateJobPreferencesRequest
    ): Promise<UpdateJobPreferencesResponse> {
        const jobPreferences = await prisma.$transaction(async (tx) => {
            const result = await tx.userJobPreference.upsert({
                where: { userId: currentUser.id },
                
                // Some important stuff here
                // First, (undefined) -> The user may or may not sent field
                // Second, (null) -> The user can clear the field and sent
                // Third, Enum value or string -> The user set a value and sent field
                
                // For update, only include fields that are not undefined.
                update: {
                    ...(requestBody.profileVisibility !== undefined && {
                        profileVisibility: requestBody.profileVisibility,
                    }),
                    ...(requestBody.jobSearchStatus !== undefined && {
                        jobSearchStatus: requestBody.jobSearchStatus,
                    }),
                    // If desiredJobTitle was undefined -> undefined === undefined -> skip field
                    // If desiredJobTitle was null -> null !== undefined -> include field, set database value to null
                    // If desiredJobTitle was string -> string !== undefined -> include field, set database value to that string
                    ...(requestBody.desiredJobTitle !== undefined && {
                        desiredJobTitle: requestBody.desiredJobTitle,
                    }),
                    ...(requestBody.preferredLocation !== undefined && {
                        preferredLocation: requestBody.preferredLocation,
                    }),
                },
                // FIX: No need to enforce double default unless necessary
                // The database have already provide default values
                create: {
                    userId: currentUser.id,
                    ...(requestBody.profileVisibility !== undefined && {
                        profileVisibility: requestBody.profileVisibility,
                    }),
                    ...(requestBody.jobSearchStatus !== undefined && {
                        jobSearchStatus: requestBody.jobSearchStatus,
                    }),
                    ...(requestBody.desiredJobTitle !== undefined && {
                        desiredJobTitle: requestBody.desiredJobTitle,
                    }),
                    ...(requestBody.preferredLocation !== undefined && {
                        preferredLocation: requestBody.preferredLocation,
                    }),
                },
                select: {
                    profileVisibility: true,
                    jobSearchStatus: true,
                    desiredJobTitle: true,
                    preferredLocation: true,
                    updatedAt: true,
                },
            });

            await this.auditLogger.log(tx, {
                action: "JOB_PREFERENCE_UPDATED",
                targetId: currentUser.id,
                message: JobPreferenceUpdated(),
                actor: currentUser,
            });

            return result;
        });
        return {
            message: "Job Preference Updated Successfully",
            userJobPreference: jobPreferences
        }
    }
    
    public async changeAvatar(
        currentUser: CurrentUser,
        avatarFile: Express.Multer.File
    ): Promise<ChangeAvatarResponse> {
        // 1. Verify that file exist
        if (!avatarFile) {
            throw new HttpError(400, "Avatar file is required");
        }
        // 2. Validate image type
        const allowedImageMimeTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
        ];
        if (!allowedImageMimeTypes.includes(avatarFile.mimetype)) {
            throw new HttpError(400, "Only JPG, JPEG and PNG images are allowed");
        }
        // 3. Validate image size
        const MAX_IMAGE_SIZE = 3 * 1024 * 1024 // 3MB
        if (avatarFile.size > MAX_IMAGE_SIZE) {
            throw new HttpError(400, "Image file must not exceed 3MB");
        }
        // 4. Save image
        const avatarUrl = await this.fileStorageService.saveAvatar(avatarFile);
        // 5. Update userProfile.avatarUrl and write the audit log in one transaction
        await prisma.$transaction(async (tx) => {
            await tx.userProfile.update({
                where: { userId: currentUser.id },
                data: {
                    avatarUrl
                },
            });

            await this.auditLogger.log(tx, {
                action: "AVATAR_CHANGED",
                targetId: currentUser.id,
                message: AvatarChanged(),
                actor: currentUser,
            });
        });
        // 6. Return AvatarUrl
        return {
            message: "Avatar updated successfully",
            avatarUrl: avatarUrl,
        }
    }

    public async changePassword(
        currentUser: CurrentUser,
        requestBody: ChangePasswordRequest
    ): Promise<ChangePasswordResponse> {
        // 1. Find user to get their current passwordHash
        const user = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: {
                passwordHash: true,
            }
        });
        // 2. Check if the user is null (not found)
        if (!user) {
            throw new HttpError(404, "User not found")
        }
        // 3. Compare current password with stored passwordHash
        const isCurrentPasswordMatch = await this.passwordHasher.compare(
            requestBody.currentPassword,
            user.passwordHash
        );
        // 4. If current password doesn't match, reject password change
        if (!isCurrentPasswordMatch) {
            throw new HttpError(400, "Invalid current password");
        }
        // 5. Compare new password with stored passwordHash
        const isNewPasswordDifferent = await this.passwordHasher.compare(
            requestBody.newPassword,
            user.passwordHash
        );
        // 6. If new password is the same as old password, reject password change
        if (!isNewPasswordDifferent) {
            throw new HttpError(400, "New password cannot be the same as old password")
        }
        // 7. Else, hash new password
        const newPasswordHash = await this.passwordHasher.hash(
            requestBody.newPassword
        );
        // 8. Update Prisma with new passwordHash and write the audit log in one transaction
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: currentUser.id },
                data: {
                    passwordHash: newPasswordHash,
                },
            });

            await this.auditLogger.log(tx, {
                action: "PASSWORD_CHANGED",
                targetId: currentUser.id,
                message: PasswordChanged(currentUser.email),
                actor: currentUser,
            });
        });
        return {
            message: "Password changed successfully",
        };
    }
}