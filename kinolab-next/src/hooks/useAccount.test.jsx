import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  signOut: vi.fn(),
  callback: null,
}));
vi.mock("../services/backend", () => ({
  signOut: mocks.signOut,
  client: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (callback) => {
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));
import useAccount from "./useAccount";
import { filterMovies } from "../domain";
const session = { user: { id: "user-1", email: "user@example.invalid" } };
let chain;
let externalChain;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.rpc.mockResolvedValue({ data: false });
  mocks.signOut.mockResolvedValue({ failed: false });
  chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: { display_name: "Name", preferred_language: "hy" },
    })),
    then: (resolve) =>
      Promise.resolve({ data: [{ movie_id: "1" }] }).then(resolve),
    insert: vi.fn(async () => ({ error: null })),
    delete: vi.fn(() => chain),
  };
  externalChain = {
    ...chain,
    select: vi.fn(() => externalChain),
    eq: vi.fn(() => externalChain),
    delete: vi.fn(() => externalChain),
    insert: vi.fn(async () => ({ error: null })),
    then: (resolve) => Promise.resolve({ data: [{ external_movie_id: "41" }] }).then(resolve),
  };
  mocks.from.mockImplementation((table) =>
    table === "user_external_watchlist" ? externalChain : chain,
  );
});
it("keeps account watchlist writes scoped to the authenticated user", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  const { result } = renderHook(() => useAccount());
  await waitFor(() => expect(result.current.cloudReady).toBe(true));
  expect(result.current.list.has("catalog:1")).toBe(true);
  await act(() => result.current.toggle({ id: "catalog:2" }));
  expect(chain.insert).toHaveBeenCalledWith({
    user_id: "user-1",
    movie_id: "2",
  });
  expect(result.current.list.has("catalog:2")).toBe(true);
  expect(localStorage.getItem("cinewave:my-list")).toBeNull();
  await act(() => result.current.toggle({ id: "catalog:1" }));
  expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  expect(chain.eq).toHaveBeenCalledWith("movie_id", "1");
  expect(result.current.list.has("catalog:1")).toBe(false);
});
it("does not record a cloud list success when the write fails", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  chain.insert.mockResolvedValue({ error: Error("denied") });
  const { result } = renderHook(() => useAccount());
  await waitFor(() => expect(result.current.cloudReady).toBe(true));
  await act(async () => {
    await expect(result.current.toggle({ id: "catalog:2" })).rejects.toThrow(
      "listFailed",
    );
  });
  expect(result.current.list.has("catalog:2")).toBe(false);
});
it("restores the guest list after local logout", async () => {
  localStorage.setItem("cinewave:my-list", JSON.stringify(["catalog:guest"]));
  mocks.getSession.mockResolvedValue({ data: { session } });
  const { result } = renderHook(() => useAccount());
  await waitFor(() => expect(result.current.cloudReady).toBe(true));
  await act(() => result.current.logout());
  expect(mocks.signOut).toHaveBeenCalledTimes(1);
  expect(result.current.session).toBeNull();
  expect([...result.current.list]).toEqual(["catalog:guest"]);
});
it("ignores malformed guest-list storage instead of breaking startup", async () => {
  localStorage.setItem(
    "cinewave:my-list",
    JSON.stringify({ unexpected: true }),
  );
  const { result } = renderHook(() => useAccount());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect([...result.current.list]).toEqual([]);
});

it("loads and saves external film favorites separately from legacy catalog favorites", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  const { result } = renderHook(() => useAccount());
  await waitFor(() => expect(result.current.cloudReady).toBe(true));
  expect(result.current.list.has("catalog:1")).toBe(true);
  expect(result.current.list.has("catalog:external:41")).toBe(true);
  await act(() => result.current.toggle({ id: "catalog:external:42" }));
  expect(mocks.from).toHaveBeenCalledWith("user_external_watchlist");
  expect(externalChain.insert).toHaveBeenCalledWith({
    user_id: "user-1",
    external_movie_id: "42",
  });
  expect(result.current.list.has("catalog:external:42")).toBe(true);
  await act(() => result.current.toggle({ id: "catalog:external:41" }));
  expect(externalChain.eq).toHaveBeenCalledWith("external_movie_id", "41");
  expect(result.current.list.has("catalog:external:41")).toBe(false);
  expect(chain.insert).not.toHaveBeenCalled();
});
it("never adds external favorites to the UI if the member insert is rejected", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  const { result } = renderHook(() => useAccount());
  await waitFor(() => expect(result.current.cloudReady).toBe(true));
  externalChain.insert.mockResolvedValue({ error: Error("RLS denied") });
  await act(async () => {
    await expect(result.current.toggle({ id: "catalog:external:45" })).rejects.toThrow("listFailed");
  });
  expect(result.current.list.has("catalog:external:45")).toBe(false);
});

it("restores signed-in external favorites after a full hook remount and matches My List movie IDs", async () => {
  const stored = ["41"];
  mocks.getSession.mockResolvedValue({ data: { session } });
  externalChain.insert.mockImplementation(async (data) => {
    stored.push(data.external_movie_id);
    return { error: null };
  });
  externalChain.then = (resolve) =>
    Promise.resolve({ data: stored.map((external_movie_id) => ({ external_movie_id })) }).then(resolve);
  const initial = renderHook(() => useAccount());
  await waitFor(() => expect(initial.result.current.cloudReady).toBe(true));
  await act(() => initial.result.current.toggle({ id: "catalog:external:42" }));
  expect(initial.result.current.list.has("catalog:external:42")).toBe(true);
  initial.unmount();

  // A re-opened browser tab fetches the saved key from the database.
  const next = renderHook(() => useAccount());
  await waitFor(() => expect(next.result.current.cloudReady).toBe(true));
  expect(next.result.current.list.has("catalog:external:42")).toBe(true);
  expect(next.result.current.list.has("catalog:external:41")).toBe(true);
  expect(next.result.current.list.has("external:42")).toBe(false);
  const movies = [{
    id: "catalog:external:42",
    titles: { en: "Animals" },
    descriptions: { en: "External movie" },
    genres: ["Drama"],
    kind: "Movie",
  }];
  expect(filterMovies(movies, { route: "my-list", list: next.result.current.list })).toEqual(movies);
});

it("canonicalizes legacy external:id input without breaking guest favorites", async () => {
  const { result } = renderHook(() => useAccount());
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(() => result.current.toggle({ id: "external:7" }));
  expect(result.current.list.has("catalog:external:7")).toBe(true);
  expect(JSON.parse(localStorage.getItem("cinewave:my-list"))).toContain("catalog:external:7");
});
