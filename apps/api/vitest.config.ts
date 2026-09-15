import { defineConfig } from "vitest/config";

import { testDatabaseUrl } from "./tests/setup/TestDatabaseUrl";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],

        // Applied to the worker's `process.env` before any test module loads,
        // which matters: `app.ts` and `lib/prisma.ts` both read
        // `DATABASE_URL` at import time. Setting it here rather than in a
        // `.env.test` file also sidesteps dotenv's refusal to overwrite a
        // variable that is already set.
        env: {
            DATABASE_URL: testDatabaseUrl(),
        },

        // Creates the test database and brings it up to the latest migration,
        // once per run.
        globalSetup: ["tests/setup/GlobalSetup.ts"],

        // Every test file truncates the same database, so they cannot run at
        // the same time. Without this the suite fails in ways that do not
        // reproduce when a file is run on its own.
        fileParallelism: false,

        // bcrypt and the first Prisma connection are both slow enough to
        // trip the default timeouts on a cold run.
        testTimeout: 20_000,
        hookTimeout: 60_000,
    },
});
