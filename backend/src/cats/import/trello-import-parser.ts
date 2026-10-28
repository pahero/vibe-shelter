export type TrelloChecklistItem = { name: string; state: string };
export type TrelloChecklist = {
  name: string;
  checkItems?: TrelloChecklistItem[];
};

export function parseCardName(value: string): {
  name: string;
  nameNumber?: number;
} {
  const match = value.trim().match(/^(.*?)\s+#(\d+)$/);
  if (!match) return { name: value.trim() };
  const nameNumber = Number(match[2]);
  return Number.isSafeInteger(nameNumber) && nameNumber > 0
    ? { name: match[1].trim(), nameNumber }
    : { name: value.trim() };
}

export function parseDescription(value: string): {
  locationName: string | null;
  sponsorName: string | null;
  intakeDetails: string | null;
} {
  const lines = value.replace(/\u200b/g, "").split(/\r?\n/);
  let locationName: string | null = null;
  let sponsorName: string | null = null;
  let intakeStart = -1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    const location = line.match(/^Location\s*:\s*(.*)$/i);
    const sponsor = line.match(/^Sponsored\s+by\s*:\s*(.*)$/i);
    if (location) locationName = headerValue(location[1]);
    if (sponsor) sponsorName = headerValue(sponsor[1]);
    if (/^Kitten\s+no\.?\s*.*\(2026\)/i.test(line)) intakeStart = index + 1;
  }
  const intakeDetails =
    intakeStart < 0 ? null : lines.slice(intakeStart).join("\n").trim() || null;
  return { locationName, sponsorName, intakeDetails };
}

function headerValue(value: string): string | null {
  const cleaned = value.trim().replace(/^-\s+/, "");
  return !cleaned || cleaned === "-" ? null : cleaned;
}

function normalized(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type CheckedImportData = {
  felvFivTestDone: boolean;
  passport: boolean;
  microchipNumber: string | null;
  adopterName: string | null;
  adopterAddress: string | null;
  vaccines: Array<{ type: "CORE" | "RABIES"; vaccineName: string }>;
};

export function readCheckedData(
  checklists: TrelloChecklist[],
): CheckedImportData {
  const result: CheckedImportData = {
    felvFivTestDone: false,
    passport: false,
    microchipNumber: null,
    adopterName: null,
    adopterAddress: null,
    vaccines: [],
  };
  const vaccineNames = new Set<string>();
  for (const checklist of checklists) {
    for (const item of checklist.checkItems ?? []) {
      if (item.state.toLowerCase() !== "complete") continue;
      const key = normalized(item.name);
      if (/\b(fiv|felv)\b/.test(key) && /test/.test(key))
        result.felvFivTestDone = true;
      if (/\b(eu pass|eu heimtierausweis|passport)\b/.test(key))
        result.passport = true;
      if (/\b(chip|microchip)\b/.test(key)) {
        const matches = item.name.match(/\d{10,20}/g);
        const number = matches?.find(
          (candidate) => !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(candidate),
        );
        if (number) result.microchipNumber = number;
      }
      if (checklist.name.toLowerCase().includes("adopter")) {
        const name = item.name.match(/^name\s+of\s+adopter\s+(.+)$/i);
        const address = item.name.match(/^address\s+of\s+adopter\s+(.+)$/i);
        if (name?.[1].trim()) result.adopterName = name[1].trim();
        if (address?.[1].trim()) result.adopterAddress = address[1].trim();
        if (
          !name &&
          !address &&
          !/^(name|address|adress|preparation fee paid|flight fee paid)\b/i.test(
            item.name.trim(),
          )
        ) {
          if (
            /\b(straße|strasse|street|road|plz|postcode|zip|\d{4,6})\b/i.test(
              item.name,
            )
          )
            result.adopterAddress ??= item.name.trim();
          else if (!/\b(eur|€|paid|fee)\b/i.test(item.name))
            result.adopterName ??= item.name.trim();
        }
      }
      if (checklist.name.toLowerCase().includes("vaccination")) {
        const vaccine = key.startsWith("1st vaccination")
          ? "First vaccination"
          : key.startsWith("2nd vaccination")
            ? "Second vaccination"
            : key.startsWith("rabies")
              ? "Rabies"
              : null;
        if (vaccine && !vaccineNames.has(vaccine)) {
          vaccineNames.add(vaccine);
          result.vaccines.push({
            type: vaccine === "Rabies" ? "RABIES" : "CORE",
            vaccineName: vaccine,
          });
        }
      }
    }
  }
  return result;
}
