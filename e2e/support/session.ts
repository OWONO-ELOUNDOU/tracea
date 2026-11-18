import { expect, request, type APIRequestContext, type Page } from "@playwright/test";
import type { TestAccount } from "../fixtures/accounts.js";

/** URL of the e2e API started by the Playwright config (same default as the web build). */
export const API_URL = "http://localhost:3001";

/** Signs in through the login page and waits for the projects screen. */
export async function signIn(page: Page, account: TestAccount): Promise<void> {
  if (!page.url().endsWith("/connexion")) await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail", { exact: true }).fill(account.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/projets$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mes projets" })).toBeVisible();
}

interface ProjectSummary {
  id: string;
  name: string;
}

/**
 * Direct API session for test setup and cleanup, independent from the browser context.
 * Mutations follow the double-submit CSRF scheme: the token returned by `/auth/csrf` is also
 * set as a cookie in this context, and echoed back in the header.
 */
export class ApiSession {
  private constructor(
    private readonly context: APIRequestContext,
    private csrfToken: string,
  ) {}

  static async signIn(account: TestAccount): Promise<ApiSession> {
    const context = await request.newContext({ baseURL: API_URL });
    const session = new ApiSession(context, await fetchCsrf(context));
    const login = await session.mutate("POST", "/auth/login", account);
    expect(login.status, `API login of ${account.email}`).toBe(200);
    // Login rotates the CSRF cookie.
    session.csrfToken = await fetchCsrf(context);
    return session;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const items: ProjectSummary[] = [];
    let cursor: string | null = null;
    do {
      const response = await this.context.get("/projects", {
        params: cursor === null ? { limit: 50 } : { limit: 50, cursor },
      });
      expect(response.status()).toBe(200);
      const page = (await response.json()) as {
        items: ProjectSummary[];
        nextCursor: string | null;
      };
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor !== null);
    return items;
  }

  async getProject(id: string): Promise<number> {
    return (await this.context.get(`/projects/${id}`)).status();
  }

  async createProject(name: string): Promise<ProjectSummary> {
    const response = await this.mutate("POST", "/projects", { name });
    expect(response.status).toBe(201);
    return (response.body as { project: ProjectSummary }).project;
  }

  /** Soft-deletes every project of the account, so each test starts from an empty list. */
  async deleteAllProjects(): Promise<void> {
    for (const project of await this.listProjects()) {
      const response = await this.mutate("DELETE", `/projects/${project.id}`);
      expect(response.status).toBe(204);
    }
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }

  private async mutate(
    method: "POST" | "DELETE",
    path: string,
    data?: unknown,
  ): Promise<{ status: number; body: unknown }> {
    const response = await this.context.fetch(path, {
      method,
      headers: { "X-CSRF-Token": this.csrfToken },
      ...(data === undefined ? {} : { data }),
    });
    const body: unknown = response.status() === 204 ? undefined : await response.json();
    return { status: response.status(), body };
  }
}

async function fetchCsrf(context: APIRequestContext): Promise<string> {
  const response = await context.get("/auth/csrf");
  expect(response.status()).toBe(200);
  return ((await response.json()) as { token: string }).token;
}

/** Runs `action` with an API session of `account`, closing it afterwards. */
export async function withApiSession<T>(
  account: TestAccount,
  action: (session: ApiSession) => Promise<T>,
): Promise<T> {
  const session = await ApiSession.signIn(account);
  try {
    return await action(session);
  } finally {
    await session.dispose();
  }
}

/** Project name unique to this test run, so repeated runs never match a previous project. */
export function uniqueProjectName(base: string): string {
  return `${base} ${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
