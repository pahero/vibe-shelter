"use client";

import Link from "next/link";
import { CatCard as CatCardType } from "@/lib/api";
import { tagChipStyle } from "@/lib/tag-colors";
import { formatDateShort } from "@/lib/utils";

export type CatCardProps = {
  cat: CatCardType;
  showProfileLink?: boolean;
};

const sexLabels = {
  FEMALE: "Female",
  MALE: "Male",
  UNKNOWN: "Unknown sex",
};

const sterilizationLabels = {
  STERILIZED: "Neutered",
  NOT_STERILIZED: "Not neutered",
  UNKNOWN: "Neutering unknown",
};

function optionalDate(date: string | null): string {
  return date ? formatDateShort(date) : "Not set";
}

export function CatCard({ cat, showProfileLink = true }: CatCardProps) {
  const initials = cat.name.trim().slice(0, 2).toUpperCase() || "CAT";
  const profileHref = `/cats/${cat.id}`;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#d4c7b4] bg-white/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md has-focus-visible:ring-2 has-focus-visible:ring-[#d05a2c]">
      {showProfileLink && <Link href={profileHref} aria-label={`Open profile for ${cat.name}`} className="absolute inset-0 z-10 cursor-pointer" />}
      <div className="relative h-40 bg-gradient-to-br from-[#f1d8c7] to-[#d05a2c]/20">
        {cat.primaryPhotoUrl ? (
          <div
            aria-label={`Photo of ${cat.name}`}
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${cat.primaryPhotoUrl})` }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#b24a20]" aria-label={`No photo for ${cat.name}`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d05a2c]/25 bg-white/55 shadow-sm">
              <span className="text-4xl" aria-hidden="true">🐾</span>
            </div>
            <span className="rounded-full bg-white/85 px-3 py-1 font-mono text-xs font-bold shadow-sm">{initials}</span>
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{cat.name}</h3>
            <p className="text-sm text-[#6d6a66]">{[sexLabels[cat.sex], cat.color].filter(Boolean).join(" • ")}</p>
          </div>
        </div>

        <dl className="grid gap-2 text-sm text-gray-700">
          <div className="flex justify-between gap-3">
            <dt className="text-[#6d6a66]">Intake</dt>
            <dd className="font-medium">{optionalDate(cat.intakeDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6d6a66]">Birth estimate</dt>
            <dd className="font-medium">{optionalDate(cat.estimatedBirthDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6d6a66]">Neutering</dt>
            <dd className="font-medium text-right">{sterilizationLabels[cat.sterilizationStatus]}</dd>
          </div>
          {cat.microchipNumber && (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6d6a66]">Microchip</dt>
              <dd className="font-mono text-xs font-medium">{cat.microchipNumber}</dd>
            </div>
          )}
        </dl>

        {cat.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {cat.tags.map((tag) => (
              <span key={tag.id} style={tagChipStyle(tag)} className="rounded-full border px-2.5 py-1 text-xs font-semibold text-gray-900">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[#d4c7b4] pt-3">
          <span className="text-xs text-[#6d6a66]">Updated {formatDateShort(cat.updatedAt)}</span>
          {showProfileLink && (
            <span className="inline-flex items-center justify-center rounded-lg border border-[#d05a2c]/30 bg-[#d05a2c]/10 px-3 py-2 text-xs font-semibold text-[#b24a20] transition group-hover:bg-[#d05a2c]/20">
              Open profile
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
