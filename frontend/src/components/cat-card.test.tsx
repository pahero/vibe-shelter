import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatCard as CatCardType, catsApi } from "@/lib/api";
import { CatCard } from "./cat-card";

describe("CatCard", () => {
  it("shows the cat name number in the card heading", () => {
    const cat: CatCardType = {
      id: "cat-1",
      name: "Tom",
      nameNumber: 3,
      sex: "MALE",
      color: null,
      estimatedBirthDate: null,
      intakeDate: null,
      archivedAt: null,
      archivingReasonId: null,
      archivingReasonName: null,
      sterilizationStatus: "UNKNOWN",
      currentLocationId: null,
      currentLocationName: null,
      createdByUserId: null,
      isTest: false,
      primaryPhotoUrl: null,
      primaryPhotoPositionY: null,
      microchipNumber: null,
      passport: false,
      sponsorName: null,
      adopterName: null,
      adopterAddress: null,
      felvFivTestDone: false,
      intakeDetails: null,
      intakeSource: null,
      updatedAt: "2026-10-03T00:00:00.000Z",
      tags: [],
    };

    render(<CatCard cat={cat} showProfileLink={false} />);

    expect(screen.getByRole("heading", { name: "Tom #3" })).toBeVisible();
  });

  it("shows a video preview and exposes it as an expandable video", () => {
    const cat = {
      id: "cat-video",
      name: "Video Cat",
      nameNumber: 4,
      primaryPhotoUrl: "https://storage.example/cats/video.mp4?signature=abc",
      primaryPhotoPositionY: null,
      sex: "UNKNOWN",
      color: null,
      estimatedBirthDate: null,
      intakeDate: null,
      archivedAt: null,
      archivingReasonId: null,
      archivingReasonName: null,
      sterilizationStatus: "UNKNOWN",
      currentLocationId: null,
      currentLocationName: null,
      createdByUserId: null,
      isTest: false,
      microchipNumber: null,
      passport: false,
      sponsorName: null,
      adopterName: null,
      adopterAddress: null,
      felvFivTestDone: false,
      intakeDetails: null,
      intakeSource: null,
      updatedAt: "2026-10-03T00:00:00.000Z",
      tags: [],
    } as CatCardType;

    render(<CatCard cat={cat} showProfileLink={false} onPhotoClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Expand video of Video Cat" }).querySelector("video"))
      .toHaveAttribute("src", cat.primaryPhotoUrl);
  });

  it("only renders the favorite heart when enabled and toggles its selected state", async () => {
    const cat: CatCardType = { id: "cat-heart", name: "Mimi", nameNumber: 2, sex: "FEMALE", color: null, estimatedBirthDate: null, intakeDate: null, sterilizationStatus: "UNKNOWN", currentLocationId: null, currentLocationName: null, createdByUserId: null, isTest: false, primaryPhotoUrl: null, primaryPhotoPositionY: null, microchipNumber: null, passport: false, sponsorName: null, adopterName: null, adopterAddress: null, felvFivTestDone: false, intakeDetails: null, intakeSource: null, updatedAt: "2026-10-03T00:00:00.000Z", tags: [], isFavorite: false };
    const toggle = vi.spyOn(catsApi, "toggleCatFavorite").mockResolvedValue({ favorite: true });
    const { rerender } = render(<CatCard cat={cat} showProfileLink={false} />);
    expect(screen.queryByRole("button", { name: "Add Mimi to favorites" })).not.toBeInTheDocument();
    rerender(<CatCard cat={cat} showProfileLink={false} showFavorite />);
    const button = screen.getByRole("button", { name: "Add Mimi to favorites" });
    expect(button.querySelector("svg")).toHaveAttribute("fill", "none");
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledWith(cat.id);
    expect(await screen.findByRole("button", { name: "Remove Mimi from favorites" })).toBeVisible();
    toggle.mockRestore();
  });
});
