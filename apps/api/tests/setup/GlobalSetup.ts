import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { testDatabaseUrl } from "./TestDatabaseUrl";

const apiRoot = fileURLToPath(new URL("../..", import.meta.url));
const prismaCli = fileURLToPath(
    new URL("../../node_modules/prisma/build/index.js", import.meta.url)
);

/**
 * Runs once before the whole suite.
 *
 * `prisma migrate deploy` creates the test database if it does not exist and
 * applies every migration in `prisma/migrations`. Using the real migrations —
 * rather than `db push` against the schema — means the tests run against the
 * same DDL that production would get, so a migration that is wrong fails here
 * instead of on deployment.
 */
export default function setup(): void {
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
        cwd: apiRoot,
        stdio: "inherit",
        env: {
            ...process.env,
            DATABASE_URL: testDatabaseUrl(),
        },
    });
}
