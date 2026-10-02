import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { DailyGoalSheet } from "./DailyGoalSheet";

function renderSheet(minutes = 10) {
  const onChange = vi.fn();
  renderWithIntl(
    <div data-ui="garden">
      <DailyGoalSheet open onOpenChange={() => {}} minutes={minutes} onChange={onChange} />
    </div>,
  );
  return onChange;
}

describe("DailyGoalSheet (U6-7)", () => {
  it("is a dialog with the minutes as radios, the saved one checked", () => {
    renderSheet(15);
    expect(screen.getByRole("dialog", { name: "Daily goal" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect((screen.getByRole("radio", { name: "15 min" }) as HTMLInputElement).checked).toBe(true);
  });

  it("reports the picked minutes", () => {
    const onChange = renderSheet();
    fireEvent.click(screen.getByRole("radio", { name: "20 min" }));
    expect(onChange).toHaveBeenLastCalledWith(20);
  });

  it("keeps a saved value that isn't an option", () => {
    renderSheet(12);
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect((screen.getByRole("radio", { name: "12 min" }) as HTMLInputElement).checked).toBe(true);
  });
});
