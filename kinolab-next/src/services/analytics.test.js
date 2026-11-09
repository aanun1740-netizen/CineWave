import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  backendFetch: vi.fn(),
  config: { url:"https://zayssiouqexwdicudalc.supabase.co", key:"public-test-key", analyticsEnabled:false },
}));
vi.mock("./backend", () => ({
  backendFetch: mocks.backendFetch,
  config: mocks.config,
}));
import { metricsEnabled, recordMetric } from "./analytics";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.analyticsEnabled = false;
  mocks.backendFetch.mockResolvedValue({ ok:true });
});

describe("privacy-preserving staging event metrics", () => {
  it("never calls Supabase unless explicitly enabled", () => {
    expect(metricsEnabled()).toBe(false);
    recordMetric("page_view", "", "hy");
    recordMetric("watch_click", "catalog:external:33", "en");
    expect(mocks.backendFetch).not.toHaveBeenCalled();
  });
  it("records only bounded anonymous aggregate fields after enabling", () => {
    mocks.config.analyticsEnabled = true;
    recordMetric("watch_click", "catalog:external:33", "en");
    expect(mocks.backendFetch).toHaveBeenCalledTimes(1);
    const [url, request] = mocks.backendFetch.mock.calls[0];
    expect(url).toContain("/rest/v1/rpc/kinolab_record_event");
    expect(request.method).toBe("POST");
    expect(request.keepalive).toBe(true);
    expect(JSON.parse(request.body)).toEqual({
      p_event:"watch_click", p_movie_key:"catalog:external:33",
      p_language:"en", p_device:expect.stringMatching(/^(mobile|desktop)$/),
    });
    expect(request.body).not.toMatch(/user_id|ip_address|search_query|referrer|user_agent/);
  });
  it("rejects fabricated event types and potential visitor identifiers", () => {
    mocks.config.analyticsEnabled = true;
    recordMetric("search_query", "personal-name", "hy");
    recordMetric("film_open", "https://elsewhere.invalid", "ru");
    recordMetric("page_view", "catalog:external:2", "en");
    expect(mocks.backendFetch).not.toHaveBeenCalled();
  });
});
