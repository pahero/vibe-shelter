"use client";

import Link from "next/link";
import { TagColorStrip } from "@/components/tag-color-strip";
import { CatCard as CatCardType, catsApi } from "@/lib/api";
import { tagChipStyle } from "@/lib/tag-colors";
import { formatDateShort } from "@/lib/utils";
import { useState } from "react";

export type CatCardProps = {
  cat: CatCardType;
  showProfileLink?: boolean;
  showTags?: boolean;
  showFavorite?: boolean;
  onPhotoClick?: () => void;
};

const sexLabels = {
  FEMALE: "Female",
  MALE: "Male",
  UNKNOWN: "Unknown sex",
};

function formatAge(dateString: string | null): string {
  if (!dateString) return "Not set";

  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return "Not set";

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (today.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "Not set";

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0 || years === 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

export function CatCard({ cat, showProfileLink = true, showTags = true, showFavorite = false, onPhotoClick }: CatCardProps) {
  const profileHref = `/cats/${cat.id}`;
  const [favorite, setFavorite] = useState(cat.isFavorite);
  const [savingFavorite, setSavingFavorite] = useState(false);


  async function toggleFavorite() {
    if (savingFavorite) return;
    setSavingFavorite(true);
    try {
      const result = await catsApi.toggleCatFavorite(cat.id);
      setFavorite(result.favorite);
    } finally {
      setSavingFavorite(false);
    }
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#d4c7b4] bg-white/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md has-focus-visible:ring-2 has-focus-visible:ring-[#d05a2c]">
      {showProfileLink && <Link href={profileHref} aria-label={`Open profile for ${cat.name}`} className="absolute inset-0 z-10 cursor-pointer" />}
      {showFavorite && <button type="button" onClick={toggleFavorite} disabled={savingFavorite} aria-label={favorite ? `Remove ${cat.name} from favorites` : `Add ${cat.name} to favorites`} title={favorite ? "Remove from favorites" : "Add to favorites"} className={`absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white disabled:opacity-60 ${favorite ? "text-rose-600" : "text-gray-500"}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
      </button>}
      <div className="relative aspect-video bg-gradient-to-br from-[#f1d8c7] to-[#d05a2c]/20">
        {cat.primaryPhotoUrl ? (
          onPhotoClick ? (
            <button
              type="button"
              onClick={onPhotoClick}
              aria-label={`Expand photo of ${cat.name}`}
              className="h-full w-full bg-cover bg-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d05a2c]"
              style={{ backgroundImage: `url(${cat.primaryPhotoUrl})`, backgroundPositionY: cat.primaryPhotoPositionY === null ? "50%" : `${cat.primaryPhotoPositionY}%` }}
            />
          ) : (
            <div
              aria-label={`Photo of ${cat.name}`}
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${cat.primaryPhotoUrl})`, backgroundPositionY: cat.primaryPhotoPositionY === null ? "50%" : `${cat.primaryPhotoPositionY}%` }}
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#b24a20]" aria-label={`No photo for ${cat.name}`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d05a2c]/25 bg-white/55 shadow-sm">
              <span className="text-4xl" aria-hidden="true">🐾</span>
            </div>
            <span className="max-w-[85%] rounded-full bg-white/85 px-3 py-1 text-center text-sm font-semibold shadow-sm">{cat.name} #{cat.nameNumber}</span>
          </div>
        )}
      </div>
      <TagColorStrip tags={cat.tags} />

      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{cat.name} #{cat.nameNumber}</h3>
            <p className="text-sm text-[#6d6a66]">{[sexLabels[cat.sex], cat.color].filter(Boolean).join(" • ")}</p>
          </div>
        </div>

        <dl className="grid gap-1 text-sm text-gray-700">
          {cat.archivingReasonName && (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6d6a66]">Archived</dt>
              <dd className="text-right font-medium text-red-700">{cat.archivingReasonName}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-[#6d6a66]">Location</dt>
            <dd className="text-right font-medium">{cat.currentLocationName || "Not set"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6d6a66]">Age</dt>
            <dd className="text-right font-medium">{formatAge(cat.estimatedBirthDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6d6a66]">Microchip</dt>
            <dd className="text-right font-mono text-xs font-medium">{cat.microchipNumber || "Not set"}</dd>
          </div>
        </dl>

        {showTags && cat.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {cat.tags.map((tag) => (
              <span key={tag.id} style={tagChipStyle(tag)} className="rounded-full border px-2.5 py-1 text-xs font-semibold text-gray-900">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-[#d4c7b4] pt-3">
          <span className="text-xs text-[#6d6a66]">Updated {formatDateShort(cat.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}
