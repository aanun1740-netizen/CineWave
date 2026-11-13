import { describe, expect, it } from "vitest";
import { cleanEmbedUrl, isCleanPlayerMovie } from "./clean-player";

describe("cleanEmbedUrl", () => {
  it("converts VK pages and VK iframe snippets", () => {
    const result = "https://vkvideo.ru/video_ext.php?oid=-220018529&id=456248794";
    expect(cleanEmbedUrl("https://vkvideo.ru/video-220018529_456248794")).toBe(result);
    expect(cleanEmbedUrl('<iframe src="https://vk.ru/video_ext.php?oid=-220018529&amp;id=456248794"></iframe>')).toBe(result);
  });
  it("converts recognized providers to embed endpoints", () => {
    expect(cleanEmbedUrl("https://rutube.ru/video/0123456789abcdef0123456789abcdef/"))
      .toBe("https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef");
    expect(cleanEmbedUrl("https://ok.ru/video/123456")).toBe("https://ok.ru/videoembed/123456");
    expect(cleanEmbedUrl("https://vimeo.com/17220")).toBe("https://player.vimeo.com/video/17220");
    expect(cleanEmbedUrl("https://archive.org/details/big_buck_bunny")).toBe("https://archive.org/embed/big_buck_bunny");
    expect(cleanEmbedUrl("https://www.youtube.com/watch?v=abcdefghijk")).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk");
    expect(cleanEmbedUrl("https://dailymotion.com/video/x8y4abc")).toBe("https://www.dailymotion.com/embed/video/x8y4abc");
    expect(cleanEmbedUrl("https://api.nextembed.ws/embed/movie/673")).toBe("https://api.nextembed.ws/embed/movie/673");
  });
  it("rejects arbitrary websites, short links, unsafe schemes and injected domains", () => {
    [
      "https://vk.cc/d3SBfV",
      "https://rutube.ru.evil.com/video/0123456789abcdef0123456789abcdef",
      "https://example.com/embed/video/123",
      "javascript:alert(1)",
      "http://ok.ru/video/123",
      '<iframe src="https://evil.test/"><script>bad</script>',
      "https://www.youtube.com/watch?v=abcdefghijk&redirect=evil",
    ].forEach((url) => expect(cleanEmbedUrl(url)).toBeNull());
  });
  it("never changes legacy external movies to the clean player", () => {
    const url = "https://vkvideo.ru/video-1_2";
    expect(isCleanPlayerMovie({playbackMode:"external"}, url)).toBe(false);
    expect(isCleanPlayerMovie({playbackMode:"clean"}, url)).toBe(true);
  });
});
