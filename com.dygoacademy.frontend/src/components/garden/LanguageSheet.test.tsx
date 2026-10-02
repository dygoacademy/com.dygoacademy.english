import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { LanguageSheet } from "./LanguageSheet";

function renderSheet(
  props: Partial<React.ComponentProps<typeof LanguageSheet>> = {},
) {
  const onChange = vi.fn();
  renderWithIntl(
    <div data-ui="garden">
      <LanguageSheet
        open
        onOpenChange={() => {}}
        uiLocale="en-US"
        meaningLocale="vi-VN"
        onChange={onChange}
        {...props}
      />
    </div>,
  );
  return onChange;
}

describe("LanguageSheet", () => {
  it("is a dialog with both settings as radio groups, the current ones checked", () => {
    renderSheet();
    expect(screen.getByRole("dialog", { name: "Language" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "App language" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Meanings in" })).toBeTruthy();
    expect(
      (screen.getByRole("radio", { name: "English" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (
        screen.getByRole("radio", {
          name: "Tiếng Việt + English",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it("names each app language in its own language", () => {
    renderSheet();
    expect(screen.getByRole("radio", { name: "简体中文" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Tiếng Việt" })).toBeTruthy();
  });

  it("reports the app language and the meaning language separately", () => {
    const onChange = renderSheet();
    fireEvent.click(screen.getByRole("radio", { name: "Tiếng Việt" }));
    expect(onChange).toHaveBeenLastCalledWith({ uiLocale: "vi-VN" });
    fireEvent.click(screen.getByRole("radio", { name: "English only" }));
    expect(onChange).toHaveBeenLastCalledWith({ meaningLocale: null });
    fireEvent.click(screen.getByRole("radio", { name: "简体中文 + English" }));
    expect(onChange).toHaveBeenLastCalledWith({ meaningLocale: "zh-CN" });
  });

  it("locks the choices while saving and says when a save failed", () => {
    renderSheet({ saving: true });
    expect(
      (screen.getByRole("radio", { name: "简体中文" }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it("says when a save failed", () => {
    renderSheet({ error: true });
    expect(
      screen.getByText(
        "That didn’t save. Check your connection and try again.",
      ),
    ).toBeTruthy();
  });

  it("hides UK/US English unless given (U6-7)", () => {
    renderSheet();
    expect(screen.queryByRole("group", { name: "English style" })).toBeNull();
  });

  it("picks UK or US English (U6-7)", () => {
    const onChange = renderSheet({ englishVariety: "en-US" });
    expect(screen.getByRole("group", { name: "English style" })).toBeTruthy();
    expect(
      (screen.getByRole("radio", { name: "US English" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "UK English" }));
    expect(onChange).toHaveBeenLastCalledWith({ englishVariety: "en-GB" });
  });
});
