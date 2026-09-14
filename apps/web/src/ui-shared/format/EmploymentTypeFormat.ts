/**
 * `EmploymentType` reaches the UI as the database's screaming snake case
 * ("ON_SITE"). This turns it into something a person reads ("On Site").
 */
export function formatEmploymentType(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}
