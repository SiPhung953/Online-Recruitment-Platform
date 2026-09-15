import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { disconnectDatabase, resetDatabase } from "../setup/TestDatabase";
import { TEST_PASSWORD, createJobSeeker } from "../setup/Fixtures";
import { RoleConstant } from "../../src/api-shared/constant/RoleConstant";

/**
 * UC-AUTH-01 (Register) and UC-AUTH-02 (Login).
 *
 * The one place where fixtures are *not* used for setup, because registering
 * and logging in are what is under test.
 */
describe("Authentication", () => {
    beforeEach(resetDatabase);
    afterAll(disconnectDatabase);

    describe("POST /auth/register", () => {
        it("creates a Job Seeker account", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({ email: "new.user@test.local", password: TEST_PASSWORD });

            expect(response.status).toBe(201);

            const created = await prisma.user.findUnique({
                where: { email: "new.user@test.local" },
            });
            expect(created).not.toBeNull();
            // Registration takes no role: everyone who signs up is a seeker.
            expect(created?.roleId).toBe(RoleConstant.JOB_SEEKER);
            expect(created?.status).toBe("ACTIVE");
        });

        it("never stores the password in plain text", async () => {
            await request(app)
                .post("/auth/register")
                .send({ email: "new.user@test.local", password: TEST_PASSWORD });

            const created = await prisma.user.findUnique({
                where: { email: "new.user@test.local" },
            });

            expect(created?.passwordHash).not.toBe(TEST_PASSWORD);
            expect(created?.passwordHash).toMatch(/^\$2[aby]\$/); // a bcrypt digest
        });

        it("rejects an email that is already registered", async () => {
            await createJobSeeker("taken@test.local");

            const response = await request(app)
                .post("/auth/register")
                .send({ email: "taken@test.local", password: TEST_PASSWORD });

            expect(response.status).toBe(400);
        });

        it("rejects a body missing the password", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({ email: "no.password@test.local" });

            // tsoa validates the body against the DTO before the controller
            // method runs, so this never reaches AuthService.
            expect(response.status).toBe(400);
        });
    });

    describe("POST /auth/login", () => {
        it("returns an access token for correct credentials", async () => {
            const seeker = await createJobSeeker("seeker@test.local");

            const response = await request(app)
                .post("/auth/login")
                .send({ email: seeker.email, password: TEST_PASSWORD });

            expect(response.status).toBe(200);
            expect(typeof response.body.accessToken).toBe("string");
            expect(response.body.accessToken.length).toBeGreaterThan(0);
        });

        it("rejects a wrong password", async () => {
            const seeker = await createJobSeeker("seeker@test.local");

            const response = await request(app)
                .post("/auth/login")
                .send({ email: seeker.email, password: "WrongPassword123!" });

            expect(response.status).toBe(401);
        });

        it("refuses a banned account", async () => {
            const seeker = await createJobSeeker("banned@test.local");
            await prisma.user.update({
                where: { id: seeker.id },
                data: { status: "BANNED" },
            });

            const response = await request(app)
                .post("/auth/login")
                .send({ email: seeker.email, password: TEST_PASSWORD });

            expect(response.status).toBe(403);
        });
    });

    describe("POST /auth/logout", () => {
        it("requires a token, so the audit log always has an actor", async () => {
            const withoutToken = await request(app).post("/auth/logout");
            expect(withoutToken.status).toBe(401);

            const seeker = await createJobSeeker();
            const withToken = await request(app)
                .post("/auth/logout")
                .set("Authorization", seeker.authHeader);
            expect(withToken.status).toBe(200);
        });
    });
});
