import { randomUUID } from "node:crypto";

import { prisma } from "../../src/lib/prisma";
import { JwtService } from "../../src/utils/JwtService";
import { PasswordHasher } from "../../src/utils/PasswordHasher";
import { RoleConstant } from "../../src/api-shared/constant/RoleConstant";

/**
 * Row builders for the integration tests.
 *
 * These write to the database directly instead of driving the API, on purpose.
 * A test about applying for a job should fail only when *applying* is broken —
 * if its setup went through register, login, create-company and post-job, a
 * defect in any of those would also fail it, and the report would point at the
 * wrong place. The flows that build state are covered by their own tests.
 */

export const TEST_PASSWORD = "Password123!";

let cachedPasswordHash: Promise<string> | null = null;

/**
 * bcrypt is intentionally slow — around 100ms per hash at cost factor 10. Every
 * fixture account shares one password, so the work is done once per test file
 * rather than once per account.
 */
function passwordHash(): Promise<string> {
    cachedPasswordHash ??= new PasswordHasher().hash(TEST_PASSWORD);
    return cachedPasswordHash;
}

export interface TestActor {
    id: string;
    email: string;
    roleId: number;
    token: string;
    /** Pass straight to supertest: `.set("Authorization", actor.authHeader)`. */
    authHeader: string;
}

export interface TestEmployer extends TestActor {
    companyId: string;
}

/**
 * Tokens are minted here rather than obtained by calling `POST /auth/login`,
 * for the same reason the rows are written directly: a broken login should fail
 * the login test, not all forty others.
 */
function signTokenFor(user: { id: string; email: string; roleId: number }): string {
    return new JwtService().sign({
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
    });
}

async function createUser(email: string, roleId: RoleConstant): Promise<TestActor> {
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash: await passwordHash(),
            roleId,
            status: "ACTIVE",
        },
    });

    const token = signTokenFor(user);

    return {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        token,
        authHeader: `Bearer ${token}`,
    };
}

export function createJobSeeker(email = "seeker@test.local"): Promise<TestActor> {
    return createUser(email, RoleConstant.JOB_SEEKER);
}

export function createAdmin(email = "admin@test.local"): Promise<TestActor> {
    return createUser(email, RoleConstant.ADMIN);
}

/**
 * An employer and the company they own.
 *
 * The two are created together because `Company.ownerEmployerId` is unique —
 * one company per employer — and almost nothing an employer can do works
 * without one.
 */
export async function createEmployer(
    email = "employer@test.local",
    companyName = "Test Company"
): Promise<TestEmployer> {
    const actor = await createUser(email, RoleConstant.EMPLOYER);

    const company = await prisma.company.create({
        data: {
            ownerEmployerId: actor.id,
            name: companyName,
            city: "Ho Chi Minh City",
            district: "District 1",
            description: "A company created for the test suite.",
        },
    });

    return { ...actor, companyId: company.id };
}

type JobStatusLiteral = "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "CLOSED" | "EXPIRED" | "DELETED";
type EmploymentTypeLiteral = "ON_SITE" | "REMOTE" | "HYBRID";

export interface JobOverrides {
    title?: string;
    description?: string;
    requirement?: string;
    employmentType?: EmploymentTypeLiteral;
    location?: string;
    status?: JobStatusLiteral;
    deadline?: Date;
}

/** A job posting, ACTIVE and open for a month unless told otherwise. */
export async function createJob(employer: TestEmployer, overrides: JobOverrides = {}) {
    const status = overrides.status ?? "ACTIVE";

    return prisma.job.create({
        data: {
            createdByEmployerId: employer.id,
            companyId: employer.companyId,
            title: overrides.title ?? "Backend Engineer",
            description:
                overrides.description ??
                "Build and operate the services behind our platform, from schema design through to production.",
            requirement:
                overrides.requirement ?? "Comfortable with TypeScript and relational databases.",
            employmentType: overrides.employmentType ?? "ON_SITE",
            location: overrides.location ?? "Ho Chi Minh City",
            status,
            deadline: overrides.deadline ?? daysFromNow(30),
            // A posting is only ACTIVE because a moderator approved it, so the
            // timestamp has to agree with the status.
            approvedAt: status === "ACTIVE" ? new Date() : null,
        },
    });
}

/**
 * A CV row.
 *
 * No file is written to disk. Nothing under test reads the bytes — the API
 * stores a path and serves it with `express.static` — so creating a real file
 * would add cleanup for no coverage.
 */
export async function createResume(seeker: TestActor, title = "My CV") {
    return prisma.resume.create({
        data: {
            userId: seeker.id,
            title,
            fileUrl: `/uploads/resumes/${randomUUID()}-cv.pdf`,
            fileType: "PDF",
            fileSize: 1024,
        },
    });
}

export interface PreferenceOverrides {
    desiredJobTitle?: string | null;
    preferredLocation?: string | null;
    jobSearchStatus?: "OPEN_TO_WORK" | "NOT_LOOKING";
}

/** The stored preferences the recommender reads. */
export async function setJobPreference(seeker: TestActor, overrides: PreferenceOverrides = {}) {
    return prisma.userJobPreference.create({
        data: {
            userId: seeker.id,
            desiredJobTitle: overrides.desiredJobTitle ?? null,
            preferredLocation: overrides.preferredLocation ?? null,
            jobSearchStatus: overrides.jobSearchStatus ?? "OPEN_TO_WORK",
        },
    });
}

/** An application in its initial state. */
export async function createApplication(
    seeker: TestActor,
    jobId: string,
    resumeId: string
) {
    return prisma.application.create({
        data: {
            userId: seeker.id,
            jobId,
            resumeId,
            status: "SUBMITTED",
        },
    });
}

export function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

export function daysAgo(days: number): Date {
    return daysFromNow(-days);
}
