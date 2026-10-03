import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatCard as CatCardType } from "@/lib/api";
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
      archivationReasonId: null,
      archivationReasonName: null,
      sterilizationStatus: "UNKNOWN",
      currentLocationId: null,
      currentLocationName: null,
      createdByUserId: null,
      isTest: false,
      primaryPhotoUrl: null,
      microchipNumber: null,
      passportNumber: null,
      adopterName: null,
      adopterAddress: null,
      felvFivTestDone: false,
      rescueSource: null,
      updatedAt: "2026-10-03T00:00:00.000Z",
      tags: [],
    };

    render(<CatCard cat={cat} showProfileLink={false} />);

    expect(screen.getByRole("heading", { name: "Tom #3" })).toBeVisible();
  });
});
