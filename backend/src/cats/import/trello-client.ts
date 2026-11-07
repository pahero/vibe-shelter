import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TrelloChecklist } from "./trello-import-parser";

export type TrelloCard = {
  id: string;
  name: string;
  url: string;
  shortUrl?: string;
  desc: string;
  idLabels: string[];
  labels?: Array<{ id: string; name: string }>;
  checklists: TrelloChecklist[];
  attachments: TrelloAttachment[];
};

export type TrelloAttachment = {
  url?: string;
  name?: string;
  mimeType?: string;
  isUpload?: boolean;
};

@Injectable()
export class TrelloClient {
  constructor(private readonly config: ConfigService) {}

  async getCard(cardUrl: string): Promise<TrelloCard> {
    const match = cardUrl.match(
      /^https:\/\/trello\.com\/c\/([A-Za-z0-9]+)(?:\/[^/?#]+)?$/,
    );
    if (!match)
      throw new BadRequestException("trelloUrl must be a Trello card URL");
    const key = this.config.get<string>("TRELLO_API_KEY");
    const token = this.config.get<string>("TRELLO_TOKEN");
    if (!key || !token)
      throw new ServiceUnavailableException(
        "Trello integration is not configured",
      );
    const endpoint = new URL(`https://api.trello.com/1/cards/${match[1]}`);
    endpoint.searchParams.set("key", key);
    endpoint.searchParams.set("token", token);
    endpoint.searchParams.set("fields", "all");
    endpoint.searchParams.set("labels", "all");
    endpoint.searchParams.set("checklists", "all");
    endpoint.searchParams.set("checklist_fields", "all");
    endpoint.searchParams.set("checkItem_fields", "name,state");
    endpoint.searchParams.set("attachments", "true");
    endpoint.searchParams.set(
      "attachment_fields",
      "name,url,mimeType,isUpload",
    );
    const response = await fetch(endpoint);
    if (response.status === 404)
      throw new BadRequestException(
        "Trello card was not found or is inaccessible",
      );
    if (!response.ok)
      throw new ServiceUnavailableException(
        `Trello API request failed (${response.status})`,
      );
    const card = (await response.json()) as TrelloCard;
    card.checklists = await this.getCardChecklists(card.id, key, token);
    card.attachments = await this.getCardAttachments(card.id, key, token);
    return card;
  }

  private async getCardChecklists(
    cardId: string,
    key: string,
    token: string,
  ): Promise<TrelloChecklist[]> {
    const endpoint = new URL(
      `https://api.trello.com/1/cards/${cardId}/checklists`,
    );
    endpoint.searchParams.set("key", key);
    endpoint.searchParams.set("token", token);
    endpoint.searchParams.set("checkItems", "all");
    endpoint.searchParams.set("checkItem_fields", "name,state");
    endpoint.searchParams.set("fields", "name");
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Trello checklist request failed (${response.status})`,
      );
    }
    return (await response.json()) as TrelloChecklist[];
  }

  private async getCardAttachments(
    cardId: string,
    key: string,
    token: string,
  ): Promise<TrelloAttachment[]> {
    const endpoint = new URL(
      `https://api.trello.com/1/cards/${cardId}/attachments`,
    );
    endpoint.searchParams.set("key", key);
    endpoint.searchParams.set("token", token);
    endpoint.searchParams.set("fields", "all");
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Trello attachment list request failed (${response.status})`,
      );
    }
    return (await response.json()) as TrelloAttachment[];
  }

  async downloadAttachment(
    url: string,
    maxBytes = 25 * 1024 * 1024,
  ): Promise<{ bytes: Buffer; contentType: string }> {
    const attachmentUrl = new URL(url);
    if (attachmentUrl.protocol !== "https:") {
      throw new BadRequestException("Trello attachment URL must use HTTPS");
    }
    if (
      ![
        "trello.com",
        "api.trello.com",
        "trello-attachments.s3.amazonaws.com",
      ].includes(attachmentUrl.hostname)
    ) {
      throw new BadRequestException("Attachment URL is not hosted by Trello");
    }
    const key = this.config.get<string>("TRELLO_API_KEY");
    const token = this.config.get<string>("TRELLO_TOKEN");
    if (
      attachmentUrl.hostname === "trello.com" &&
      attachmentUrl.pathname.startsWith("/1/cards/")
    ) {
      if (!key || !token) {
        throw new ServiceUnavailableException(
          "Trello integration is not configured",
        );
      }
      attachmentUrl.hostname = "api.trello.com";
    }
    if (attachmentUrl.hostname === "api.trello.com") {
      if (!key || !token) {
        throw new ServiceUnavailableException(
          "Trello integration is not configured",
        );
      }
    }
    const response = await fetch(attachmentUrl, {
      headers:
        attachmentUrl.hostname === "api.trello.com" && key && token
          ? {
              Authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`,
            }
          : {},
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Trello attachment download failed (${response.status})`,
      );
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new ServiceUnavailableException(
        "Trello attachment exceeds the size limit",
      );
    }
    if (!response.body) {
      throw new ServiceUnavailableException(
        "Trello attachment response was empty",
      );
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new ServiceUnavailableException(
          "Trello attachment exceeds the size limit",
        );
      }
      chunks.push(value);
    }
    return {
      bytes: Buffer.concat(chunks),
      contentType:
        response.headers.get("content-type") ?? "application/octet-stream",
    };
  }
}
