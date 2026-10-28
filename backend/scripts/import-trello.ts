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
  idList: string;
  name: string;
  url?: string;
  shortUrl?: string;
  closed?: boolean;
  desc?: string;
  idLabels?: string[];
  idChecklists?: string[];
  attachments?: TrelloAttachment[];
};
type TrelloBoard = {
  cards: TrelloCard[];
  lists: Array<{ id: string; name: string }>;
  labels: Array<{ id: string; name: string }>;
  checklists: Array<TrelloChecklist & { id: string; idCard: string }>;
};
type ApiRecord = {
  id: string;
  name: string;
  nameNumber: number;
  archivingReasonId?: string | null;
  archivedAt?: string | null;
  currentLocationId?: string | null;
};
type CatNameNumber = {
  id: string;
  name: string;
  nameNumber: number;
  archivingReasonId: string | null;
  archivedAt: string | null;
};
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
const archiveMode = process.argv.includes("--archive");
const oneAttachmentPerCat = process.argv.includes("--one-attachment-per-cat");

async function main(): Promise<void> {
  const board = JSON.parse(await readFile(sourcePath, "utf8")) as TrelloBoard;
  const matchingCards = archiveMode
    ? board.cards
    : board.cards.filter((card) => card.desc?.includes("(2026)"));
  const flightListIds = new Set(
    board.lists
      .filter((list) => /^\s*(?:flight|flug)\b/i.test(list.name))
      .map((list) => list.id),
  );
  const archiveCardsByNameNumber = new Map<string, TrelloCard[]>();
  const duplicateCandidates = archiveMode
    ? matchingCards
    : matchingCards.filter((card) => !flightListIds.has(card.idList));
  for (const card of duplicateCandidates) {
    const parsedName = parseCardName(card.name);
    const key = nameNumberKey(parsedName.name, parsedName.nameNumber ?? 1);
    const group = archiveCardsByNameNumber.get(key) ?? [];
    group.push(card);
    archiveCardsByNameNumber.set(key, group);
  }
  const archiveCardIdsToSkip = new Set<string>();
  let duplicateArchiveGroupCount = 0;
  let ambiguousArchiveGroupCount = 0;
  let skippedClosedArchiveCardCount = 0;
  for (const group of archiveCardsByNameNumber.values()) {
    if (group.length < 2) continue;
    duplicateArchiveGroupCount++;
    const openCards = group.filter((card) => !card.closed);
    if (openCards.length === 1) {
      for (const card of group) {
        if (card !== openCards[0]) {
          archiveCardIdsToSkip.add(card.id);
          if (card.closed) skippedClosedArchiveCardCount++;
        }
      }
    } else {
      ambiguousArchiveGroupCount++;
      for (const card of group) archiveCardIdsToSkip.add(card.id);
    }
  }
  const selectedCards = duplicateCandidates.filter(
    (card) => !archiveCardIdsToSkip.has(card.id),
  );
  const cards = selectedCards;
  const ignoredFlightCardCount = matchingCards.length - cards.length;
  for (const card of duplicateCandidates) {
    if (!archiveCardIdsToSkip.has(card.id)) continue;
    const parsedName = parseCardName(card.name);
    const reason =
      archiveCardsByNameNumber
        .get(nameNumberKey(parsedName.name, parsedName.nameNumber ?? 1))
        ?.filter((candidate) => !candidate.closed).length === 1
        ? "closed duplicate; sole non-closed duplicate selected"
        : "ambiguous duplicate group; no card imported";
    console.log(
      `Not imported (${reason}): ${card.name} — ${trelloCardUrl(card)}`,
    );
  }
  for (const card of matchingCards) {
    if (!flightListIds.has(card.idList) || archiveMode) continue;
    console.log(
      `Not imported (Flight/Flug list): ${card.name} — ${trelloCardUrl(card)}`,
    );
  }
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
          ...(archiveMode
            ? {
                archivingReason:
                  board.lists.find((list) => list.id === card.idList)?.name ??
                  "MISSING LIST",
              }
            : {}),
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
          attachmentCount: oneAttachmentPerCat
            ? Math.min(
                card.attachments?.filter((attachment) => attachment.url)
                  .length ?? 0,
                1,
              )
            : (card.attachments?.length ?? 0),
          ...(card.url || card.shortUrl
            ? { trelloUrl: trelloCardUrl(card) }
            : {}),
        })}`,
      );
    }
    console.log(
      `Dry run complete: ${cards.length} ${archiveMode ? "archive" : "non-flight"} cards;${duplicateArchiveGroupCount ? ` selected the sole non-closed Trello card from duplicate groups, skipping ${skippedClosedArchiveCardCount} closed cards; left ${ambiguousArchiveGroupCount} ambiguous groups unimported (${duplicateArchiveGroupCount} duplicate groups total);` : ""} ignored ${ignoredFlightCardCount} flight-list cards;${oneAttachmentPerCat ? " limited uploads to one attachment per cat;" : ""} no API changes made.`,
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
  const archiveReasonIds = archiveMode
    ? await ensureArchiveReasons(board.lists, cookie)
    : new Map<string, string>();
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
  let archivedCount = 0;
  for (const [index, card] of cards.entries()) {
    try {
      const parsedName = parseCardName(card.name);
      const nameNumber = parsedName.nameNumber ?? 1;
      const key = nameNumberKey(parsedName.name, nameNumber);
      const alreadyImported = existingCats.get(key);
      if (alreadyImported) {
        if (archiveMode && !alreadyImported.archivingReasonId) {
          const reasonId = archiveReasonIds.get(card.idList);
          if (!reasonId)
            throw new Error(
              `No archiving reason found for source list ${card.idList}`,
            );
          await archiveCat(alreadyImported.id, reasonId, cookie);
          alreadyImported.archivingReasonId = reasonId;
          alreadyImported.archivedAt = new Date().toISOString();
          archivedCount++;
        }
        skippedDuplicateCount++;
        console.log(
          `Not imported (already exists): ${parsedName.name} #${nameNumber} — ${trelloCardUrl(card)}`,
        );
        continue;
      }
      const description = parseDescription(card.desc ?? "");
      const archiveReasonId = archiveMode
        ? archiveReasonIds.get(card.idList)
        : undefined;
      if (archiveMode && !archiveReasonId)
        throw new Error(
          `No archiving reason found for source list ${card.idList}`,
        );
      const locationName = description.locationName ?? fallbackLocationName;
      const locationLookupKey = locationKey(locationName);
      let currentLocationId = locationByName.get(locationLookupKey);
      if (!currentLocationId) {
        const createdLocation = await api<{ id: string }>(
          "/api/locations",
          cookie,
          { method: "POST", body: { name: locationName } },
        );
        currentLocationId = createdLocation.id;
        locationByName.set(locationLookupKey, currentLocationId);
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
      existingCats.set(key, {
        id: cat.id,
        name: cat.name,
        nameNumber: cat.nameNumber,
        archivingReasonId: null,
        archivedAt: null,
      });
      if (archiveReasonId) {
        await archiveCat(cat.id, archiveReasonId, cookie);
        const importedCat = existingCats.get(key);
        if (importedCat) {
          importedCat.archivingReasonId = archiveReasonId;
          importedCat.archivedAt = new Date().toISOString();
        }
        archivedCount++;
      }
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
      const attachments = (card.attachments ?? []).filter(
        (attachment) => attachment.url,
      );
      for (const attachment of oneAttachmentPerCat
        ? attachments.slice(0, 1)
        : attachments) {
        try {
          await importAttachment(cat.id, attachment, cookie);
        } catch (error) {
          console.error(
            `Attachment import failed for ${card.name} / ${attachment.name ?? attachment.url}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      console.log(
        `Imported ${index + 1}/${cards.length}: ${card.name} -> ${cat.id}`,
      );
    } catch (error) {
      console.error(
        `Not imported (failed): ${card.name} — ${trelloCardUrl(card)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log(
    `Created ${createdCount} cats; archived ${archivedCount}; skipped ${skippedDuplicateCount} existing name/number duplicates; selected the sole non-closed Trello card from duplicate groups, skipping ${skippedClosedArchiveCardCount} closed cards and leaving ${ambiguousArchiveGroupCount} ambiguous groups unimported; ignored ${ignoredFlightCardCount} flight-list cards;${oneAttachmentPerCat ? " limited uploads to one attachment per cat." : ""}`,
  );
}

async function loadExistingCats(
  cookie: string,
): Promise<Map<string, CatNameNumber>> {
  const existing = new Map<string, CatNameNumber>();
  for (const archived of [false, true]) {
    let skip = 0;
    let total = 0;
    do {
      const page = await api<CatPage>(
        `/api/cats?archived=${archived}&skip=${skip}&limit=100`,
        cookie,
      );
      for (const cat of page.data) {
        existing.set(nameNumberKey(cat.name, cat.nameNumber), cat);
      }
      total = page.total;
      skip += page.limit;
    } while (skip < total);
  }
  return existing;
}

async function ensureArchiveReasons(
  lists: Array<{ id: string; name: string }>,
  cookie: string,
): Promise<Map<string, string>> {
  const reasons = await api<Array<{ id: string; name: string }>>(
    "/api/cats/archiving-reasons",
    cookie,
  );
  const idsByName = new Map(
    reasons.map((reason) => [
      reason.name.trim().toLocaleLowerCase(),
      reason.id,
    ]),
  );
  const reasonIdsByList = new Map<string, string>();
  for (const list of lists) {
    const name = list.name.trim();
    const key = name.toLocaleLowerCase();
    let reasonId = idsByName.get(key);
    if (!reasonId) {
      const created = await api<{ id: string }>(
        "/api/cats/archiving-reasons",
        cookie,
        { method: "POST", body: { name } },
      );
      reasonId = created.id;
      idsByName.set(key, reasonId);
      console.log(`Created archiving reason: ${name}`);
    }
    reasonIdsByList.set(list.id, reasonId);
  }
  return reasonIdsByList;
}

async function archiveCat(
  catId: string,
  reasonId: string,
  cookie: string,
): Promise<void> {
  await api(`/api/cats/${catId}/archive`, cookie, {
    method: "POST",
    body: { reasonId },
  });
}

function trelloCardUrl(card: TrelloCard): string {
  return card.shortUrl ?? card.url ?? `https://trello.com/c/${card.id}`;
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

async function importAttachment(
  catId: string,
  attachment: TrelloAttachment,
  cookie: string,
): Promise<void> {
  const attachmentName = attachment.name ?? new URL(attachment.url!).pathname;
  const extension = attachmentName.split(".").pop()?.toLowerCase();
  const mimeType = attachment.mimeType?.toLowerCase() ?? "";
  const isPdf = mimeType === "application/pdf" || extension === "pdf";
  const videoType = mimeType.startsWith("video/")
    ? mimeType === "video/mp4" ||
      mimeType === "video/webm" ||
      mimeType === "video/quicktime"
      ? mimeType
      : null
    : extension === "mp4"
      ? "video/mp4"
      : extension === "webm"
        ? "video/webm"
        : extension === "mov"
          ? "video/quicktime"
          : null;
  if (mimeType.startsWith("video/") && !videoType) {
    throw new Error(`Unsupported video format (${attachment.mimeType})`);
  }
  if (
    !videoType &&
    ["mov", "avi", "mkv", "m4v", "mpeg", "mpg"].includes(extension ?? "")
  ) {
    throw new Error(
      `Unsupported video format (.${extension}); use MP4, WebM, or MOV`,
    );
  }

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
  const isVideo = videoType !== null;
  const uploadName = videoType
    ? `${attachmentName.replace(/\.[^/.]+$/, "")}.${videoType === "video/mp4" ? "mp4" : videoType === "video/webm" ? "webm" : "mov"}`
    : attachmentName;
  const destination = isPdf
    ? {
        path: `/api/cats/${catId}/documents`,
        field: "document",
        type: "application/pdf",
      }
    : {
        path: `/api/cats/${catId}/photos`,
        field: "photo",
        type:
          videoType ??
          attachment.mimeType ??
          response.headers.get("content-type") ??
          "image/jpeg",
      };
  form.append(
    destination.field,
    new Blob([bytes], { type: destination.type }),
    basename(uploadName),
  );
  const upload = await fetch(`${apiBase}${destination.path}`, {
    method: "POST",
    headers: { cookie },
    body: form,
  }).catch((error: unknown) => {
    throw new Error(
      `Network request failed: POST ${destination.path}: ${describeError(error)}`,
    );
  });
  if (!upload.ok)
    throw new Error(
      `${isPdf ? "Document" : isVideo ? "Video" : "Photo"} upload failed (${upload.status}): ${await upload.text()}`,
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
