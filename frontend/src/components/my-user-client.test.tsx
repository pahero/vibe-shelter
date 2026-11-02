import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyUserClient } from "./my-user-client";
import { updateCurrentUserName } from "@/lib/backend";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/backend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");
  return { ...actual, updateCurrentUserName: vi.fn(), changePassword: vi.fn() };
});

describe("MyUserClient", () => {
  beforeEach(() => {
    vi.mocked(updateCurrentUserName).mockReset().mockResolvedValue();
    refresh.mockReset();
  });

  it("updates the current user's name", async () => {
    render(<MyUserClient user={{ id: "user-1", email: "staff@example.com", fullName: "Staff User", role: "staff" }} />);

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "  Updated User  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => expect(updateCurrentUserName).toHaveBeenCalledWith("Updated User"));
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Name updated successfully.");
  });
});
