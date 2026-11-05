import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catsApi } from "@/lib/api";
import { TrelloCatImportClient } from "./trello-cat-import-client";

afterEach(() => vi.restoreAllMocks());

describe("TrelloCatImportClient", () => {
  it("submits a Trello card URL and displays import errors", async () => {
    const importCard = vi
      .spyOn(catsApi, "importTrelloCard")
      .mockRejectedValue(new Error("Card could not be imported."));
    render(<TrelloCatImportClient />);

    fireEvent.change(screen.getByLabelText("Trello card URL *"), {
      target: { value: "https://trello.com/c/card123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cat" }));

    await waitFor(() =>
      expect(importCard).toHaveBeenCalledWith("https://trello.com/c/card123"),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Card could not be imported.",
    );
  });

  it("links to the existing cat when the Trello card is already imported", async () => {
    vi.spyOn(catsApi, "importTrelloCard").mockRejectedValue({
      message: "A cat with this Trello card already exists.",
      statusCode: 409,
      duplicateCat: { id: "existing-cat", name: "Momo", nameNumber: 3 },
    });
    render(<TrelloCatImportClient />);
    fireEvent.change(screen.getByLabelText("Trello card URL *"), {
      target: { value: "https://trello.com/c/card123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cat" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A cat with this Trello card already exists.",
    );
    expect(screen.getByRole("link", { name: "View Momo #3" })).toHaveAttribute(
      "href",
      "/cats/existing-cat",
    );
  });

  it("recovers the existing cat link when duplicate metadata is embedded in the message", async () => {
    vi.spyOn(catsApi, "importTrelloCard").mockRejectedValue({
      message:
        "A cat with this Trello card already exists. [duplicateCatId=existing-cat]",
      statusCode: 409,
    });
    render(<TrelloCatImportClient />);
    fireEvent.change(screen.getByLabelText("Trello card URL *"), {
      target: { value: "https://trello.com/c/card123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cat" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A cat with this Trello card already exists.",
    );
    expect(
      screen.getByRole("link", { name: "View existing cat" }),
    ).toHaveAttribute("href", "/cats/existing-cat");
  });
});
