"use client";

import { PermanentCatDeletionClient } from "@/components/permanent-cat-deletion-client";
import { TrelloCatImportClient } from "@/components/trello-cat-import-client";

export function OwnerToolsClient() {
  return (
    <div className="w-full space-y-6">
      <PermanentCatDeletionClient />
      <TrelloCatImportClient />
    </div>
  );
}
