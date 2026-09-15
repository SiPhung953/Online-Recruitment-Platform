import { prisma } from "../../src/lib/prisma";
import { RoleConstant } from "../../src/api-shared/constant/RoleConstant";

/**
 * Every table holding test-created rows, ordered so the list reads
 * child-before-parent. `CASCADE` makes the order unnecessary for correctness,
 * but keeping it readable documents the shape of the schema.
 *
 * `roles` is deliberately absent: it is reference data, not test data, and
 * every user row points at it. It is re-seeded below instead of emptied.
 */
const TEST_DATA_TABLES = [
    "logs",
    "applications",
    "resumes",
    "user_job_preferences",
    "user_profiles",
    "jobs",
    "companies",
    "password_reset_tokens",
    "users",
];

/**
 * Returns the database to a known-empty state.
 *
 * Called from `beforeEach`, not `beforeAll`: a test that reads what a previous
 * test wrote passes or fails depending on the order the files happen to run in,
 * which is the single most common way an integration suite becomes untrustworthy.
 *
 * `TRUNCATE ... CASCADE` is used rather than `deleteMany` because it is one
 * round trip regardless of row count and does not care about foreign-key order.
 */
export async function resetDatabase(): Promise<void> {
    const tableList = TEST_DATA_TABLES.map((table) => `"${table}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
    await seedRoles();
}

/**
 * The three roles, with the ids `RoleConstant` hard-codes.
 *
 * These are a foreign key for every user, so they have to exist before any
 * fixture can be created.
 */
async function seedRoles(): Promise<void> {
    for (const [name, id] of Object.entries(RoleConstant)) {
        // A numeric TypeScript enum also produces reverse mappings
        // (`{ "1": "JOB_SEEKER" }`), so half of these entries are not roles.
        if (typeof id !== "number") continue;

        await prisma.role.upsert({
            where: { id },
            update: {},
            create: { id, name },
        });
    }
}

/** Closes the connection pool so Vitest can exit cleanly. */
export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
}
