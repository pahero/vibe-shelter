import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectWithChevron } from "./select-with-chevron";

describe("SelectWithChevron", () => {
  it("preserves native select props and change behavior", () => {
    const onChange = vi.fn();

    render(
      <SelectWithChevron
        aria-label="Status"
        defaultValue="active"
        onChange={onChange}
        className="rounded-lg"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </SelectWithChevron>,
    );

    const select = screen.getByRole("combobox", { name: "Status" });
    expect(select).toHaveValue("active");
    expect(select).toHaveClass(
      "w-full",
      "appearance-none",
      "pr-10",
      "rounded-lg",
    );

    fireEvent.change(select, { target: { value: "inactive" } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
