const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const CSRF_COOKIE = "tracea_csrf";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
  }
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  plan: "free" | "pro" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const entry = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return entry?.slice(name.length + 1);
}

async function ensureCsrf(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing !== undefined) return existing;
  const response = await fetch(`${API_URL}/auth/csrf`, { credentials: "include" });
  const body = (await response.json()) as { token: string };
  return body.token;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Query = Record<string, string | number | undefined>;

function withQuery(path: string, query: Query | undefined): string {
  if (query === undefined) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search === "" ? path : `${path}?${search}`;
}

async function request<T>(
  method: Method,
  path: string,
  options: { body?: unknown; query?: Query } = {},
): Promise<T> {
  const { body, query } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-CSRF-Token"] = await ensureCsrf();
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}${withQuery(path, query)}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204 || response.status === 202) return undefined as unknown as T;
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("json") ? await response.json() : undefined;
  if (!response.ok) {
    const problem =
      typeof payload === "object" && payload !== null && "code" in payload
        ? (payload as ProblemDetails)
        : {
            type: "about:blank",
            title: "Erreur",
            status: response.status,
            code: "UNKNOWN",
            detail: "Le service est momentanément indisponible. Réessayez dans un instant.",
          };
    throw new ApiError(problem);
  }
  return payload as T;
}

/** Card-level view of a project, as returned by `GET /projects`. */
export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  currentVersion: { number: number } | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  descriptionText: string | null;
  parameters: Record<string, unknown> | null;
  site: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  currentVersion: {
    id: string;
    number: number;
    origin: "generated" | "edited" | "restored";
    createdAt: string;
  } | null;
  lastJob: null;
}

export interface ProjectPage {
  items: ProjectSummary[];
  /** Opaque; pass it back unchanged as `cursor`. `null` on the last page. */
  nextCursor: string | null;
}

export interface ProjectPatch {
  name?: string;
  descriptionText?: string | null;
}

const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;

async function projectOf(response: Promise<{ project: ProjectDetail }>): Promise<ProjectDetail> {
  return (await response).project;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ status: string }>("POST", "/auth/register", { body: { email, password } }),
  resendVerification: (email: string) =>
    request<undefined>("POST", "/auth/resend-verification", { body: { email } }),
  verifyEmail: (token: string) =>
    request<undefined>("POST", "/auth/verify-email", { body: { token } }),
  login: (email: string, password: string) =>
    request<{ user: PublicUser }>("POST", "/auth/login", { body: { email, password } }),
  logout: () => request<undefined>("POST", "/auth/logout"),
  forgotPassword: (email: string) =>
    request<undefined>("POST", "/auth/password/forgot", { body: { email } }),
  resetPassword: (token: string, password: string) =>
    request<undefined>("POST", "/auth/password/reset", { body: { token, password } }),
  me: () => request<{ user: PublicUser }>("GET", "/me"),

  listProjects: (params: { cursor?: string; limit?: number } = {}) =>
    request<ProjectPage>("GET", "/projects", {
      query: { cursor: params.cursor, limit: params.limit },
    }),
  createProject: (name: string) => projectOf(request("POST", "/projects", { body: { name } })),
  getProject: (id: string) => projectOf(request("GET", projectPath(id))),
  updateProject: (id: string, patch: ProjectPatch) =>
    projectOf(request("PATCH", projectPath(id), { body: patch })),
  // The API rejects any non-empty body on this route, so none is sent.
  duplicateProject: (id: string) => projectOf(request("POST", `${projectPath(id)}/duplicate`)),
  deleteProject: (id: string) => request<undefined>("DELETE", projectPath(id)),
};

export type ApiClient = typeof api;

/** User-facing message for an API failure; falls back to a generic sentence. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.problem.status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
    return error.problem.detail ?? error.problem.title;
  }
  return "Impossible de joindre le service. Vérifiez votre connexion et réessayez.";
}

export function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.problem.code : undefined;
}

/** True when the session is missing or expired: the caller sends the user back to sign-in. */
export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.problem.status === 401;
}
