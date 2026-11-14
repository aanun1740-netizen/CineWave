import { describe, it, expect } from "vitest";
import { normalizeAdminWatchInput } from "./watch-input";

const rutube = "https://rutube.ru/play/embed/425f1362acc34bcff78a143e83bfb1af";
const frame = '<iframe width="720" height="405" src="' + rutube + '" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>';

describe("normalizeAdminWatchInput", () => {
  it("accepts and extracts a RUTUBE embed in the normal external editor", () => {
    expect(normalizeAdminWatchInput(frame, "external")).toBe(rutube);
    expect(normalizeAdminWatchInput(frame.replace(rutube, rutube + "?r=plwd"), "external")).toBe(rutube);
    expect(normalizeAdminWatchInput(rutube, "external")).toBe(rutube);
  });
  it("accepts the same iframe in the clean-player editor", () => {
    expect(normalizeAdminWatchInput(frame, "clean")).toBe(rutube);
  });
  it("does not turn ordinary outbound movie links into embedded players", () => {
    const outgoing = "https://film.example/watch/123";
    expect(normalizeAdminWatchInput(outgoing, "external")).toBe(outgoing);
    expect(normalizeAdminWatchInput(outgoing, "clean")).toBeNull();
  });
  it("handles HTML-escaped ampersands in VK iframe snippets", () => {
    const src = "https://vk.ru/video_ext.php?oid=-220018529&amp;id=456248794";
    expect(normalizeAdminWatchInput('<iframe src="' + src + '" allowfullscreen></iframe>', "external"))
      .toBe("https://vkvideo.ru/video_ext.php?oid=-220018529&id=456248794");
  });
  it("rejects arbitrary-host iframes, scripts, duplicate frames and bad schemes", () => {
    const rejected = [
      '<iframe src="https://attacker.example/video/1"></iframe>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<iframe src="' + rutube + '"></iframe><script>alert(1)</script>',
      '<iframe src="' + rutube + '"></iframe><iframe src="' + rutube + '"></iframe>',
      '<iframe src="' + rutube + '" src="https://attacker.example"></iframe>',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      'javascript:alert(1)',
      '<h1>not a player</h1>',
    ];
    for (const candidate of rejected) {
      expect(normalizeAdminWatchInput(candidate, "external")).toBeNull();
      expect(normalizeAdminWatchInput(candidate, "clean")).toBeNull();
    }
  });
});
