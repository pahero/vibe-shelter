import {
  parseCardName,
  parseDescription,
  readCheckedData,
} from "./trello-import-parser";

describe("Trello import parsing", () => {
  it("separates a trailing name number and leaves other names untouched", () => {
    expect(parseCardName("  Momo #27 ")).toEqual({
      name: "Momo",
      nameNumber: 27,
    });
    expect(parseCardName("Momo 2")).toEqual({ name: "Momo 2" });
    expect(parseCardName("Momo #0")).toEqual({ name: "Momo #0" });
  });

  it("extracts location, sponsor and intake text despite whitespace and casing", () => {
    expect(
      parseDescription(
        "\u200b\nlocation: Shelter\nSponsored by: CCLAF\n\nKitten no. 9 (2026)\nDetails here\n",
      ),
    ).toEqual({
      locationName: "Shelter",
      sponsorName: "CCLAF",
      intakeDetails: "Details here",
    });
    expect(parseDescription("No structured information")).toEqual({
      locationName: null,
      sponsorName: null,
      intakeDetails: null,
    });
  });

  it("treats dash-only description headers as absent and strips a sponsor bullet", () => {
    expect(
      parseDescription(
        "Location: -\nSponsored by: - Someone\nKitten no 2 (2026)",
      ),
    ).toEqual({
      locationName: null,
      sponsorName: "Someone",
      intakeDetails: null,
    });
  });

  it("maps checked values only and recognizes variation in checklist labels", () => {
    const imported = readCheckedData([
      {
        name: "Documents",
        checkItems: [
          { name: "FIV/FELV test", state: "complete" },
          { name: "EU Heimtierausweis", state: "complete" },
          { name: "Chip 956000018355049", state: "complete" },
          { name: "Chip 123456789012345", state: "incomplete" },
        ],
      },
      {
        name: "adopter informations",
        checkItems: [
          { name: "Name of adopter Jane Doe", state: "complete" },
          { name: "Address of adopter 5 Main Street", state: "complete" },
          { name: "Name of adopter Ignored", state: "incomplete" },
        ],
      },
      {
        name: "Vaccinations",
        checkItems: [
          { name: "1st vaccination dob 08/05/26", state: "complete" },
          { name: "2nd vaccination", state: "incomplete" },
          { name: "Rabies 04/08/26", state: "complete" },
        ],
      },
    ]);
    expect(imported).toEqual({
      felvFivTestDone: true,
      passport: true,
      microchipNumber: "956000018355049",
      adopterName: "Jane Doe",
      adopterAddress: "5 Main Street",
      vaccines: [
        { type: "CORE", vaccineName: "First vaccination" },
        { type: "RABIES", vaccineName: "Rabies" },
      ],
    });
  });
});
