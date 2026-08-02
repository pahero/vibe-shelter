"use client";

import Link from "next/link";
import { TagColorStrip } from "@/components/tag-color-strip";
import { CatCard as CatCardType } from "@/lib/api";
import { tagChipStyle } from "@/lib/tag-colors";
import { formatDateShort } from "@/lib/utils";

export type CatCardProps = {
  cat: CatCardType;
  showProfileLink?: boolean;
  showTags?: boolean;
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

export function CatCard({ cat, showProfileLink = true, showTags = true, onPhotoClick }: CatCardProps) {
  const profileHref = `/cats/${cat.id}`;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#d4c7b4] bg-white/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md has-focus-visible:ring-2 has-focus-visible:ring-[#d05a2c]">
      {showProfileLink && <Link href={profileHref} aria-label={`Open profile for ${cat.name}`} className="absolute inset-0 z-10 cursor-pointer" />}
      <div className="relative h-40 bg-gradient-to-br from-[#f1d8c7] to-[#d05a2c]/20">
        {cat.primaryPhotoUrl ? (
          onPhotoClick ? (
            <button
              type="button"
              onClick={onPhotoClick}
              aria-label={`Expand photo of ${cat.name}`}
              className="h-full w-full bg-cover bg-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d05a2c]"
              style={{ backgroundImage: `url(${cat.primaryPhotoUrl})` }}
            />
          ) : (
            <div
              aria-label={`Photo of ${cat.name}`}
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${cat.primaryPhotoUrl})` }}
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#b24a20]" aria-label={`No photo for ${cat.name}`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d05a2c]/25 bg-white/55 shadow-sm">
              <span className="text-4xl" aria-hidden="true">🐾</span>
            </div>
            <span className="max-w-[85%] rounded-full bg-white/85 px-3 py-1 text-center text-sm font-semibold shadow-sm">{cat.name}</span>
          </div>
        )}
      </div>
      <TagColorStrip tags={cat.tags} />

      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{cat.name}</h3>
            <p className="text-sm text-[#6d6a66]">{[sexLabels[cat.sex], cat.color].filter(Boolean).join(" • ")}</p>
          </div>
        </div>

        <dl className="grid gap-1 text-sm text-gray-700">
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
