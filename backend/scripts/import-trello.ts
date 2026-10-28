import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { config } from "dotenv";
import {
  parseCardName,
  parseDescription,
  readCheckedData,
  type TrelloChecklist,
} from "../src/cats/import/trello-import-parser";

config({ path: `${import.meta.dirname}/../.env` });

type TrelloAttachment = {
  url?: string;
  name?: string;
  mimeType?: string;
  isUpload?: boolean;
};
type TrelloCard = {
  id: string;
  name: string;
  desc?: string;
  idLabels?: string[];
  idChecklists?: string[];
  attachments?: TrelloAttachment[];
};
type TrelloBoard = {
  cards: TrelloCard[];
  labels: Array<{ id: string; name: string }>;
  checklists: Array<TrelloChecklist & { id: string; idCard: string }>;
};
type ApiRecord = {
  id: string;
  name: string;
  nameNumber: number;
  currentLocationId?: string | null;
};
type CatNameNumber = { name: string; nameNumber: number };
type CatPage = {
  data: CatNameNumber[];
  total: number;
  skip: number;
  limit: number;
};
type LocationPage = {
  data: Array<{ id: string; name: string }>;
  total: number;
  skip: number;
  limit: number;
};

const apiBase = (
  process.env.SHELTER_API_URL ??
  `http://localhost:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const email = process.env.SHELTER_EMAIL;
const password = process.env.SHELTER_PASSWORD;
const trelloApiKey = process.env.TRELLO_API_KEY;
const trelloToken = process.env.TRELLO_TOKEN;
const fallbackLocationName = "Sanctuary";
const sourceArgument = process.argv.find(
  (arg) =>
    !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1],
);
if (!sourceArgument)
  throw new Error("Usage: npm run import:trello -- <folc.json> [--dry-run]");
const localSourcePath = resolve(process.cwd(), sourceArgument);
const sourcePath = existsSync(localSourcePath)
  ? localSourcePath
  : resolve(import.meta.dirname, "../../", sourceArgument);
const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const board = JSON.parse(await readFile(sourcePath, "utf8")) as TrelloBoard;
  const cards = board.cards.filter((card) => card.desc?.includes("(2026)"));
  const desiredTagNames = [
    "CCLAF",
    "sick",
    "planned as foster in Germany",
    "FIP",
  ];
  const checklistByCard = new Map<string, TrelloChecklist[]>();
  for (const checklist of board.checklists) {
    const values = checklistByCard.get(checklist.idCard) ?? [];
    values.push(checklist);
    checklistByCard.set(checklist.idCard, values);
  }
  const labelNames = new Map(
    board.labels.map((label) => [label.id, label.name.toLowerCase()]),
  );
  if (dryRun) {
    for (const [index, card] of cards.entries()) {
      const parsedName = parseCardName(card.name);
      const description = parseDescription(card.desc ?? "");
      const checked = readCheckedData(checklistByCard.get(card.id) ?? []);
      const labels = (card.idLabels ?? [])
        .map((id) => labelNames.get(id))
        .filter((name): name is string => Boolean(name));
      console.log(
        `[dry-run] ${index + 1}/${cards.length}: ${JSON.stringify({
          ...parsedName,
          nameNumber: parsedName.nameNumber ?? 1,
          ...description,
          locationName: description.locationName ?? fallbackLocationName,
          sex: labels.includes("male")
            ? "MALE"
            : labels.includes("female")
              ? "FEMALE"
              : "UNKNOWN",
          sterilizationStatus: labels.includes("neutered")
            ? "STERILIZED"
            : "UNKNOWN",
          ...checked,
          rabiesLabel: labels.includes("rabies"),
          tags: labels.filter((name) =>
            desiredTagNames.some((tag) => tag.toLowerCase() === name),
          ),
          attachmentCount: card.attachments?.length ?? 0,
        })}`,
      );
    }
    console.log(
      `Dry run complete: ${cards.length} matching cards; no API changes made.`,
    );
    return;
  }
  const cookie = await login();
  const existingCats = await loadExistingCats(cookie);
  const locations = await loadActiveLocations(cookie);
  const locationByName = new Map(
    locations.map((location) => [locationKey(location.name), location.id]),
  );
  const existingTags = await api<Array<{ id: string; name: string }>>(
    "/api/cats/tags",
    cookie,
  );
  const tagIds = new Map(
    existingTags.map((tag) => [tag.name.toLocaleLowerCase(), tag.id]),
  );
  for (const name of desiredTagNames) {
    if (!tagIds.has(name.toLocaleLowerCase())) {
      const tag = await api<{ id: string }>("/api/cats/tags", cookie, {
        method: "POST",
        body: { name },
      });
      tagIds.set(name.toLocaleLowerCase(), tag.id);
    }
  }
  const importDate = new Date();
  const dayOfMonth = importDate.getUTCDate();
  importDate.setUTCDate(1);
  importDate.setUTCMonth(importDate.getUTCMonth() - 1);
  const lastDayOfPreviousMonth = new Date(
    Date.UTC(importDate.getUTCFullYear(), importDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  importDate.setUTCDate(Math.min(dayOfMonth, lastDayOfPreviousMonth));
  const vaccineDate = importDate.toISOString().slice(0, 10);
  let createdCount = 0;
  let skippedDuplicateCount = 0;
  for (const [index, card] of cards.entries()) {
    try {
      const parsedName = parseCardName(card.name);
      const nameNumber = parsedName.nameNumber ?? 1;
      const alreadyImported = existingCats.nameNumbers.has(
        nameNumberKey(parsedName.name, nameNumber),
      );
      if (alreadyImported) {
        skippedDuplicateCount++;
        console.log(
          `Skipped duplicate ${index + 1}/${cards.length}: ${parsedName.name} #${nameNumber} already exists`,
        );
        continue;
      }
      const description = parseDescription(card.desc ?? "");
      const locationName = description.locationName ?? fallbackLocationName;
      const key = locationKey(locationName);
      let currentLocationId = locationByName.get(key);
      if (!currentLocationId) {
        const createdLocation = await api<{ id: string }>(
          "/api/locations",
          cookie,
          { method: "POST", body: { name: locationName } },
        );
        currentLocationId = createdLocation.id;
        locationByName.set(key, currentLocationId);
        console.log(`Created active location: ${locationName}`);
      }
      const checked = readCheckedData(checklistByCard.get(card.id) ?? []);
      const labels = new Set(
        (card.idLabels ?? [])
          .map((id) => labelNames.get(id))
          .filter((name): name is string => Boolean(name)),
      );
      const payload = {
        name: parsedName.name,
        nameNumber,
        sex: labels.has("male")
          ? "MALE"
          : labels.has("female")
            ? "FEMALE"
            : "UNKNOWN",
        sterilizationStatus: labels.has("neutered") ? "STERILIZED" : "UNKNOWN",
        intakeDetails: description.intakeDetails,
        sponsorName: description.sponsorName,
        currentLocationId,
        felvFivTestDone: checked.felvFivTestDone,
        passport: checked.passport,
        ...(checked.microchipNumber
          ? { microchipNumber: checked.microchipNumber }
          : {}),
        ...(checked.adopterName ? { adopterName: checked.adopterName } : {}),
        ...(checked.adopterAddress
          ? { adopterAddress: checked.adopterAddress }
          : {}),
      };
      const cat = await api<ApiRecord>("/api/cats", cookie, {
        method: "POST",
        body: payload,
      });
      createdCount++;
      existingCats.nameNumbers.add(nameNumberKey(cat.name, cat.nameNumber));
      for (const tagName of desiredTagNames) {
        if (labels.has(tagName.toLowerCase())) {
          const tagId = tagIds.get(tagName.toLowerCase());
          if (tagId)
            await api(`/api/cats/${cat.id}/tags/${tagId}`, cookie, {
              method: "POST",
            });
        }
      }
      if (
        labels.has("rabies") &&
        !checked.vaccines.some((vaccine) => vaccine.type === "RABIES")
      ) {
        checked.vaccines.push({ type: "RABIES", vaccineName: "Rabies" });
      }
      for (const vaccine of checked.vaccines) {
        await api(`/api/cats/${cat.id}/vaccinations`, cookie, {
          method: "POST",
          body: {
            type: vaccine.type,
            date: vaccineDate,
            vaccineName: vaccine.vaccineName,
          },
        });
      }
      for (const attachment of card.attachments ?? []) {
        if (!attachment.url) continue;
        try {
          await importPhoto(cat.id, attachment, cookie);
        } catch (error) {
          console.error(
            `Photo import failed for ${card.name} / ${attachment.name ?? attachment.url}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      console.log(
        `Imported ${index + 1}/${cards.length}: ${card.name} -> ${cat.id}`,
      );
    } catch (error) {
      console.error(
        `Failed card ${index + 1}/${cards.length} (${card.name}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log(
    `Created ${createdCount} cats; skipped ${skippedDuplicateCount} existing name/number duplicates out of ${cards.length} source cards.`,
  );
}

async function loadExistingCats(cookie: string): Promise<{
  nameNumbers: Set<string>;
}> {
  const existing = { nameNumbers: new Set<string>() };
  for (const archived of [false, true]) {
    let skip = 0;
    let total = 0;
    do {
      const page = await api<CatPage>(
        `/api/cats?archived=${archived}&skip=${skip}&limit=100`,
        cookie,
      );
      for (const cat of page.data) {
        existing.nameNumbers.add(nameNumberKey(cat.name, cat.nameNumber));
      }
      total = page.total;
      skip += page.limit;
    } while (skip < total);
  }
  return existing;
}

async function loadActiveLocations(
  cookie: string,
): Promise<Array<{ id: string; name: string }>> {
  const locations: Array<{ id: string; name: string }> = [];
  let skip = 0;
  let total = 0;
  do {
    const page = await api<LocationPage>(
      `/api/locations?status=ACTIVE&skip=${skip}&limit=100`,
      cookie,
    );
    locations.push(...page.data);
    total = page.total;
    skip += page.limit;
  } while (skip < total);
  return locations;
}

function locationKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function nameNumberKey(name: string, nameNumber: number): string {
  return `${name.trim().replace(/\s+/g, " ").toLocaleLowerCase()}#${nameNumber}`;
}

async function login(): Promise<string> {
  if (!email || !password)
    throw new Error("Set SHELTER_EMAIL and SHELTER_PASSWORD");
  const response = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch((error: unknown) => {
    throw new Error(
      `Network request failed: POST ${apiBase}/auth/login: ${describeError(error)}`,
    );
  });
  if (!response.ok)
    throw new Error(
      `Login failed (${response.status}): ${await response.text()}`,
    );
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie)
    throw new Error("Login response did not include authentication cookies");
  return setCookie
    .split(/,(?=[^;]+=[^;]+)/)
    .map((part) => part.split(";")[0])
    .join("; ");
}

async function api<T = unknown>(
  path: string,
  cookie: string,
  options: { method: string; body?: unknown } = { method: "GET" },
): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method,
    headers: {
      cookie,
      ...(options.body === undefined
        ? {}
        : { "content-type": "application/json" }),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  }).catch((error: unknown) => {
    throw new Error(
      `Network request failed: ${options.method} ${path}: ${describeError(error)}`,
    );
  });
  if (!response.ok)
    throw new Error(
      `${options.method} ${path} failed (${response.status}): ${await response.text()}`,
    );
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function importPhoto(
  catId: string,
  attachment: TrelloAttachment,
  cookie: string,
): Promise<void> {
  const attachmentUrl = new URL(attachment.url!);
  if (
    attachmentUrl.hostname === "trello.com" &&
    attachmentUrl.pathname.startsWith("/1/cards/") &&
    trelloApiKey &&
    trelloToken
  ) {
    attachmentUrl.hostname = "api.trello.com";
  }
  const trelloAuthHeader =
    attachmentUrl.hostname === "api.trello.com" && trelloApiKey && trelloToken
      ? `OAuth oauth_consumer_key="${trelloApiKey}", oauth_token="${trelloToken}"`
      : undefined;
  const response = await fetch(attachmentUrl, {
    headers: trelloAuthHeader ? { Authorization: trelloAuthHeader } : {},
  }).catch((error: unknown) => {
    throw new Error(
      `Network request failed downloading ${attachment.name ?? attachment.url}: ${describeError(error)}`,
    );
  });
  if (!response.ok)
    throw new Error(
      `Could not download attachment ${attachment.name ?? attachment.url}: ${response.status}${response.status === 401 ? " (verify TRELLO_API_KEY/TRELLO_TOKEN and confirm that the token's Trello account can access the board)" : ""}`,
    );
  const bytes = await response.arrayBuffer();
  const form = new FormData();
  form.append(
    "photo",
    new Blob([bytes], {
      type:
        attachment.mimeType ||
        response.headers.get("content-type") ||
        "image/jpeg",
    }),
    basename(attachment.name || new URL(attachment.url!).pathname),
  );
  const upload = await fetch(`${apiBase}/api/cats/${catId}/photos`, {
    method: "POST",
    headers: { cookie },
    body: form,
  }).catch((error: unknown) => {
    throw new Error(
      `Network request failed: POST /api/cats/${catId}/photos: ${describeError(error)}`,
    );
  });
  if (!upload.ok)
    throw new Error(
      `Photo upload failed (${upload.status}): ${await upload.text()}`,
    );
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = "cause" in error ? error.cause : undefined;
  return cause instanceof Error
    ? `${error.message} (cause: ${cause.message})`
    : error.message;
}

void main();
