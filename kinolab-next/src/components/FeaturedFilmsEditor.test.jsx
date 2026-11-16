import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import FeaturedFilmsEditor from "./FeaturedFilmsEditor";

const mock = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("../services/backend", () => ({
  client: { from: () => ({
    select: () => ({ eq: () => ({ single: mock.read }) }),
    update: (payload) => ({ eq: () => ({
      eq: (column, revision) => ({ select: () => ({
        maybeSingle: () => mock.write(payload, column, revision),
      }) }),
    }) }),
  }) },
}));

it("saves ranked films once, swaps existing selections, and protects against stale edits", async () => {
  const mk = (id, title) => ({ id, source: "supabase", titles: { en: title }, year: 2026 });
  mock.read.mockResolvedValue({ data: { movie_ids: ["catalog:1", "catalog:2"], revision: "first" } });
  mock.write.mockResolvedValueOnce({ data: { revision: "second" } }).mockResolvedValueOnce({ data: null });
  const onDirty = vi.fn();
  const user = userEvent.setup();
  render(<FeaturedFilmsEditor language="en" onDirty={onDirty}
      movies={[mk("catalog:1", "First"), mk("catalog:2", "Second")]} />);
  const first = await screen.findByRole("combobox", { name: "Slide 1" });
  const second = screen.getByRole("combobox", { name: "Slide 2" });
  expect(first.value).toBe("catalog:1");
  expect(within(first).getByRole("option", { name: "Second · 2026" })).toBeTruthy();
  await user.selectOptions(first, "catalog:2");
  expect(second.value).toBe("catalog:1");
  await user.click(screen.getByRole("button", { name: "Save order" }));
  await screen.findByText("Slide order saved.");
  expect(onDirty).toHaveBeenLastCalledWith(false);
  expect(mock.write).toHaveBeenNthCalledWith(1,
    { movie_ids: ["catalog:2", "catalog:1"], revision: expect.any(String) }, "revision", "first");
  await user.selectOptions(second, "");
  await user.click(screen.getByRole("button", { name: "Save order" }));
  await screen.findByText(/selection changed in another tab/);
  expect(screen.getByRole("button", { name: "Save order" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Reload selection" })).toBeTruthy();
  await waitFor(() => expect(mock.write).toHaveBeenLastCalledWith(
    { movie_ids: ["catalog:2"], revision: expect.any(String) }, "revision", "second"));
});
