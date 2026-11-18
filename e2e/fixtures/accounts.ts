/**
 * Verified accounts inserted into the embedded database when the e2e API starts
 * (`apps/api/test/e2e-server.ts`). Test-only credentials: they exist nowhere else.
 */
export interface TestAccount {
  email: string;
  password: string;
}

export const accounts = {
  primary: { email: "e2e-primary@tracea.test", password: "plan-de-masse-e2e-2026!" },
  secondary: { email: "e2e-secondary@tracea.test", password: "coupe-longitudinale-e2e-2026!" },
} as const satisfies Record<string, TestAccount>;
