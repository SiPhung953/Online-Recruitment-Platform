/**
 * The letter shown in a company's logo square.
 *
 * No logo is stored anywhere — `companies` has no image column — so the public
 * pages draw a brand-coloured square with the company's first letter instead of
 * inventing one. Kept here because the job list, the job detail page and the
 * company profile all need the same letter.
 */
export function companyInitial(companyName: string): string {
  const firstCharacter = companyName.trim().charAt(0)
  return firstCharacter === "" ? "?" : firstCharacter.toUpperCase()
}
