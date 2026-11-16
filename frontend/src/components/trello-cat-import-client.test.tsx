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

    fireEvent.change(screen.getByLabelText("Trello card URLs *"), {
      target: { value: "https://trello.com/c/card123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cats" }));

    await waitFor(() =>
      expect(importCard).toHaveBeenCalledWith(
        "https://trello.com/c/card123",
        false,
        null,
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Card could not be imported.",
    );
  });

  it("passes adopter-by-column mode when its checkbox is enabled", async () => {
    const importCard = vi.spyOn(catsApi, "importTrelloCard").mockResolvedValue({
      id: "imported-cat",
    });
    vi.spyOn(catsApi, "getCatCard").mockResolvedValue({
      id: "imported-cat",
      name: "Momo",
    } as Awaited<ReturnType<typeof catsApi.getCatCard>>);
    render(<TrelloCatImportClient />);
    fireEvent.change(screen.getByLabelText("Trello card URLs *"), {
      target: { value: "https://trello.com/c/card123" },
    });
    fireEvent.click(screen.getByLabelText("Перенос adopter по имени столбца"));
    fireEvent.click(screen.getByRole("button", { name: "Import cats" }));

    await waitFor(() =>
      expect(importCard).toHaveBeenCalledWith(
        "https://trello.com/c/card123",
        true,
        null,
      ),
    );
  });

  it("imports a pasted list sequentially, assigns the optional tag, and reports progress", async () => {
    const sequence: string[] = [];
    const importCard = vi
      .spyOn(catsApi, "importTrelloCard")
      .mockImplementation(async (url) => {
        sequence.push(`import:${url}`);
        return { id: url.endsWith("card1") ? "cat-1" : "cat-2" };
      });
    vi.spyOn(catsApi, "getCatCard").mockImplementation(async (id) => {
      sequence.push(`cat:${id}`);
      return { id, name: id === "cat-1" ? "Mila" : "Luna" } as Awaited<
        ReturnType<typeof catsApi.getCatCard>
      >;
    });
    render(<TrelloCatImportClient />);

    fireEvent.change(screen.getByLabelText("Trello card URLs *"), {
      target: {
        value: "https://trello.com/c/card1\nhttps://trello.com/c/card2",
      },
    });
    fireEvent.change(screen.getByLabelText("Tag to assign to imported cats"), {
      target: { value: "Archive import" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cats" }));

    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "2",
      ),
    );
    expect(importCard).toHaveBeenNthCalledWith(
      1,
      "https://trello.com/c/card1",
      false,
      "Archive import",
    );
    expect(importCard).toHaveBeenNthCalledWith(
      2,
      "https://trello.com/c/card2",
      false,
      "Archive import",
    );
    expect(sequence).toEqual([
      "import:https://trello.com/c/card1",
      "cat:cat-1",
      "import:https://trello.com/c/card2",
      "cat:cat-2",
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Finished: 2 imported, 0 skipped, 0 failed.",
    );
    expect(
      screen.getAllByRole("link", { name: "View cat" })[0],
    ).toHaveAttribute("href", "/cats/cat-1");
  });

  it("skips an already-imported Trello card and continues with the next URL", async () => {
    const importCard = vi
      .spyOn(catsApi, "importTrelloCard")
      .mockRejectedValueOnce({
        message: "A cat with this Trello card already exists.",
        statusCode: 409,
        duplicateCat: { id: "existing-cat", name: "Momo", nameNumber: 3 },
      })
      .mockResolvedValueOnce({ id: "new-cat" });
    vi.spyOn(catsApi, "getCatCard").mockResolvedValue({
      id: "new-cat",
      name: "New cat",
    } as Awaited<ReturnType<typeof catsApi.getCatCard>>);
    render(<TrelloCatImportClient />);
    fireEvent.change(screen.getByLabelText("Trello card URLs *"), {
      target: {
        value: "https://trello.com/c/card123\nhttps://trello.com/c/card456",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cats" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Finished: 1 imported, 1 skipped, 0 failed.",
    );
    expect(importCard).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(/Already imported, skipped: Momo #3/),
    ).toBeVisible();
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
    fireEvent.change(screen.getByLabelText("Trello card URLs *"), {
      target: { value: "https://trello.com/c/card123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import cats" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Finished: 0 imported, 1 skipped, 0 failed.",
    );
    expect(
      screen.getByRole("link", { name: "View existing cat" }),
    ).toHaveAttribute("href", "/cats/existing-cat");
  });

  it("shows the not-found error when importing attachments for an unlinked card", async () => {
    const importAttachments = vi
      .spyOn(catsApi, "importTrelloAttachments")
      .mockRejectedValue({
        message: "No cat is linked to this Trello card",
        statusCode: 404,
      });
    render(<TrelloCatImportClient />);
    fireEvent.change(
      screen.getByLabelText("Existing cat’s Trello card URL *"),
      { target: { value: "https://trello.com/c/unlinked123" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Replace files with Trello attachments",
      }),
    );

    await waitFor(() =>
      expect(importAttachments).toHaveBeenCalledWith(
        "https://trello.com/c/unlinked123",
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No cat is linked to this Trello card",
    );
  });

  it("shows the import failure instead of reporting that files were replaced", async () => {
    vi.spyOn(catsApi, "importTrelloAttachments").mockRejectedValue({
      message:
        "No Trello attachments could be imported; existing files were left unchanged",
      statusCode: 400,
    });
    render(<TrelloCatImportClient />);
    fireEvent.change(
      screen.getByLabelText("Existing cat’s Trello card URL *"),
      { target: { value: "https://trello.com/c/card123" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Replace files with Trello attachments",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No Trello attachments could be imported; existing files were left unchanged",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
