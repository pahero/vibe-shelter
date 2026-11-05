export function trelloCardShortId(url: string): string | null {
  const match = /^https:\/\/trello\.com\/c\/([^/?#]+)/i.exec(url);
  return match?.[1] ?? null;
}

export function canonicalTrelloCardUrl(url: string): string {
  const shortId = trelloCardShortId(url);
  if (!shortId) throw new Error("Invalid Trello card URL");
  return `https://trello.com/c/${shortId}`;
}
