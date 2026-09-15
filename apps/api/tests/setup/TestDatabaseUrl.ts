import "dotenv/config";

/**
 * Where the tests connect.
 *
 * The test database is *derived* from `DATABASE_URL` rather than configured
 * separately: there is one connection string to keep correct, no second secrets
 * file to distribute, and no way for the two to drift apart. A URL ending in
 * `/mydb` becomes `/mydb_test`.
 *
 * Deriving it is also the safety catch. Tests truncate every table before each
 * case, so pointing them at the development database would destroy it. The
 * `_test` suffix is appended here, in one place, instead of being trusted to
 * whoever set the environment.
 */
export function testDatabaseUrl(): string {
    const configured = process.env.DATABASE_URL;

    if (!configured) {
        throw new Error(
            "DATABASE_URL is not defined. The test database is derived from it, so it must be set."
        );
    }

    const url = new URL(configured);

    // Idempotent: re-deriving an already-derived URL must not produce
    // `mydb_test_test`.
    if (!url.pathname.endsWith("_test")) {
        url.pathname = `${url.pathname}_test`;
    }

    return url.toString();
}
