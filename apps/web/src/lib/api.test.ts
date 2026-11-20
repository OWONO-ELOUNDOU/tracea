import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, isUnauthenticated } from "./api";

const fetchMock = vi.fn<typeof fetch>();

function json(
  status: number,
  body: unknown,
  type = "application/json",
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": type, ...extra },
  });
}

const detail = {
  id: "p1",
  name: "Maison Mbarga",
  descriptionText: null,
  parameters: null,
  site: null,
  createdAt: "2026-11-17T10:00:00.000Z",
  updatedAt: "2026-11-17T10:00:00.000Z",
  thumbnailUrl: null,
  currentVersion: null,
  lastJob: null,
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "tracea_csrf=csrf-token";
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function lastCall() {
  const call = fetchMock.mock.calls.at(-1);
  if (call === undefined) throw new Error("fetch was not called");
  const [url, init] = call;
  const href = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
  return { url: href, init: init ?? {} };
}

describe("projects client", () => {
  it("lists projects with the cursor and limit as query parameters", async () => {
    fetchMock.mockResolvedValue(json(200, { items: [], nextCursor: null }));
    await expect(api.listProjects({ cursor: "abc+/=", limit: 5 })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    const { url, init } = lastCall();
    expect(url).toBe("http://localhost:3001/projects?cursor=abc%2B%2F%3D&limit=5");
    expect(init.method).toBe("GET");
  });

  it("omits absent query parameters", async () => {
    fetchMock.mockResolvedValue(json(200, { items: [], nextCursor: null }));
    await api.listProjects();
    expect(lastCall().url).toBe("http://localhost:3001/projects");
  });

  it("creates a project and returns its detail", async () => {
    fetchMock.mockResolvedValue(json(201, { project: detail }));
    await expect(api.createProject("Maison Mbarga")).resolves.toEqual(detail);
    const { init } = lastCall();
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Maison Mbarga" }));
    expect((init.headers as Record<string, string>)["X-CSRF-Token"]).toBe("csrf-token");
  });

  it("renames with PATCH on the project path, without If-Match", async () => {
    fetchMock.mockResolvedValue(json(200, { project: detail }, undefined, { etag: '"e2"' }));
    await expect(api.updateProject("p1", { name: "Villa" })).resolves.toEqual({
      project: detail,
      etag: '"e2"',
    });
    const { url, init } = lastCall();
    expect(url).toBe("http://localhost:3001/projects/p1");
    expect(init.method).toBe("PATCH");
    expect((init.headers as Record<string, string>)["If-Match"]).toBeUndefined();
  });

  it("reads a project with the ETag of its version", async () => {
    fetchMock.mockResolvedValue(json(200, { project: detail }, undefined, { etag: '"lx1"' }));
    await expect(api.getProject("p1")).resolves.toEqual({ project: detail, etag: '"lx1"' });
    expect(lastCall().init.method).toBe("GET");
  });

  it("sends the ETag back unchanged in If-Match", async () => {
    fetchMock.mockResolvedValue(json(200, { project: detail }, undefined, { etag: '"lx2"' }));
    const patch = { descriptionText: "Maison", parameters: { levelsCount: 1 }, site: null };
    await expect(api.updateProject("p1", patch, { ifMatch: '"lx1"' })).resolves.toEqual({
      project: detail,
      etag: '"lx2"',
    });
    const { init } = lastCall();
    const headers = init.headers as Record<string, string>;
    expect(headers["If-Match"]).toBe('"lx1"');
    expect(headers["X-CSRF-Token"]).toBe("csrf-token");
    expect(init.body).toBe(JSON.stringify(patch));
  });

  it("duplicates without a request body", async () => {
    fetchMock.mockResolvedValue(json(201, { project: detail }));
    await api.duplicateProject("p1");
    const { url, init } = lastCall();
    expect(url).toBe("http://localhost:3001/projects/p1/duplicate");
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("deletes with DELETE and the CSRF header", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteProject("p1")).resolves.toBeUndefined();
    const { init } = lastCall();
    expect(init.method).toBe("DELETE");
    expect((init.headers as Record<string, string>)["X-CSRF-Token"]).toBe("csrf-token");
  });

  it("throws the problem details of an error response", async () => {
    fetchMock.mockResolvedValue(
      json(
        401,
        { type: "about:blank", title: "Non connecté", status: 401, code: "UNAUTHENTICATED" },
        "application/problem+json",
      ),
    );
    const error: unknown = await api.getProject("p1").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(isUnauthenticated(error)).toBe(true);
  });
});
