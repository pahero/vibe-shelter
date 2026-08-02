"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ApiErrorHandler } from "@/lib/utils";
import { CatTag, Location, catsApi, locationsApi } from "@/lib/api";
import { DEFAULT_TAG_COLOR, TAG_COLOR_OPTIONS, VISIBLE_TAG_COLOR_COUNT, tagChipStyle } from "@/lib/tag-colors";

type LocationDraft = {
  name: string;
  description: string;
};

type EditingLocation = {
  id: string;
  name: string;
  description: string;
  status: Location["status"];
};

type EditingTag = {
  id: string;
  name: string;
  color: string;
};

const emptyLocation: LocationDraft = { name: "", description: "" };

const statusStyles = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-800" },
  INACTIVE: { bg: "bg-yellow-100", text: "text-yellow-800" },
  ARCHIVED: { bg: "bg-red-100", text: "text-red-800" },
};

export function EditShelterClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<CatTag[]>([]);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(emptyLocation);
  const [editingLocation, setEditingLocation] = useState<EditingLocation | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null);
  const [showAllNewTagColors, setShowAllNewTagColors] = useState(false);
  const [showAllEditTagColors, setShowAllEditTagColors] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadEditors();
  }, []);

  async function loadEditors() {
    setIsLoading(true);
    setError(null);
    try {
      const [locationsResponse, tagsResponse] = await Promise.all([
        locationsApi.listLocations({ limit: 100 }),
        catsApi.listTags(),
      ]);
      setLocations(locationsResponse.data.filter((location) => location.status !== "ARCHIVED"));
      setTags(tagsResponse);
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function createLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = locationDraft.name.trim();
    if (!name) {
      setError("Location name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await locationsApi.createLocation({
        name,
        description: locationDraft.description.trim() || undefined,
      });
      setLocationDraft(emptyLocation);
      setMessage("Location added.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveLocation(location: EditingLocation) {
    const name = location.name.trim();
    if (!name) {
      setError("Location name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await locationsApi.updateLocation(location.id, {
        name,
        description: location.description.trim() || null,
        status: location.status,
      });
      setEditingLocation(null);
      setMessage("Location updated.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeLocation(location: Location) {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await locationsApi.archiveLocation(location.id);
      setMessage("Location removed.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = tagName.trim();
    if (!name) {
      setError("Tag name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await catsApi.createTag(name, tagColor);
      setMessage("Tag added.");
      setTagName("");
      setTagColor(DEFAULT_TAG_COLOR);
      setShowAllNewTagColors(false);
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEditedTag(tag: EditingTag) {
    const name = tag.name.trim();
    if (!name) {
      setError("Tag name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await catsApi.updateTag(tag.id, { name, color: tag.color });
      setEditingTag(null);
      setShowAllEditTagColors(false);
      setMessage("Tag updated.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTag(tag: CatTag) {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await catsApi.deleteTag(tag.id);
      setMessage("Tag removed.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="w-full max-w-6xl rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-900">Edit shelter</h1>
        </div>
        <Link href="/" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white/60 px-4 text-sm font-semibold text-[#1f2320] transition hover:bg-white">
          Back to cats
        </Link>
      </div>

      {message && <p className="mt-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800">{message}</p>}
      {error && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      {isLoading && <p className="py-10 text-center text-sm text-[#6d6a66]">Loading editor...</p>}

      {!isLoading && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="space-y-6 rounded-2xl border border-[#d4c7b4] bg-white/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-3xl font-semibold text-gray-900">Locations</h2>
              <button
                type="submit"
                form="new-location-form"
                disabled={isSaving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
              >
                + New Location
              </button>
            </div>

            <form id="new-location-form" onSubmit={createLocation} className="grid gap-3 rounded-xl border border-[#d4c7b4] bg-[#fff8ee]/70 p-3">
              <input value={locationDraft.name} onChange={(event) => setLocationDraft((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="New location name" />
              <input value={locationDraft.description} onChange={(event) => setLocationDraft((prev) => ({ ...prev, description: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="Description" />
            </form>

            {locations.length === 0 && (
              <div className="rounded-lg border border-[#d4c7b4] bg-[#fff8ee]/50 p-8 text-center">
                <p className="text-sm text-gray-600">No locations found.</p>
              </div>
            )}

            <div className="grid gap-4">
              {locations.map((location) => {
                const isEditing = editingLocation?.id === location.id;
                const statusStyle = statusStyles[location.status];
                return (
                  <div key={location.id} className="rounded-lg border border-[#d4c7b4] bg-white/75 p-4 transition hover:shadow-md">
                    {isEditing && editingLocation ? (
                      <div className="grid gap-2">
                        <input value={editingLocation.name} onChange={(event) => setEditingLocation({ ...editingLocation, name: event.target.value })} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm" />
                        <input value={editingLocation.description} onChange={(event) => setEditingLocation({ ...editingLocation, description: event.target.value })} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm" placeholder="Description" />
                        <select value={editingLocation.status} onChange={(event) => setEditingLocation({ ...editingLocation, status: event.target.value as Location["status"] })} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveLocation(editingLocation)} disabled={isSaving} className="rounded-lg bg-[#d05a2c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Save</button>
                          <button type="button" onClick={() => setEditingLocation(null)} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-xs font-semibold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-gray-900">{location.name}</p>
                          {location.description && <p className="mt-1 text-sm text-[#6d6a66]">{location.description}</p>}
                          {location.ownerId && <p className="mt-3 text-xs text-gray-600"><strong>Owner:</strong> {location.ownerId.slice(0, 8)}...</p>}
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <span className={`rounded px-2 py-1 font-mono text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {location.status}
                          </span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingLocation({ id: location.id, name: location.name, description: location.description ?? "", status: location.status })} className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100">Edit</button>
                            <button type="button" onClick={() => removeLocation(location)} disabled={isSaving} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">Remove</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-[#d4c7b4] bg-white/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-3xl font-semibold text-gray-900">Tags</h2>
              <button
                type="submit"
                form="tag-form"
                disabled={isSaving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
              >
                + New Tag
              </button>
            </div>

            <form id="tag-form" onSubmit={saveTag} className="grid gap-3 rounded-xl border border-[#d4c7b4] bg-[#fff8ee]/70 p-3">
              <input value={tagName} onChange={(event) => setTagName(event.target.value)} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="Tag name" />
              <div className="flex flex-wrap gap-2" aria-label="Tag color">
                {(showAllNewTagColors ? TAG_COLOR_OPTIONS : TAG_COLOR_OPTIONS.slice(0, VISIBLE_TAG_COLOR_COUNT)).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-9 w-9 rounded-full border transition hover:scale-105 ${tagColor === color ? "border-[#1f2320] ring-2 ring-[#1f2320]/20" : "border-[#d4c7b4]"}`}
                    aria-label={`Use tag color ${color}`}
                  />
                ))}
                {!showAllNewTagColors && (
                  <button
                    type="button"
                    onClick={() => setShowAllNewTagColors(true)}
                    className="h-9 w-9 rounded-full border border-dashed border-[#d05a2c]/45 bg-white text-sm font-semibold text-[#b24a20] transition hover:bg-[#fff0e8]"
                    aria-label="Show more tag colors"
                  >
                    +
                  </button>
                )}
              </div>
            </form>

            {tags.length === 0 && (
              <div className="rounded-lg border border-[#d4c7b4] bg-[#fff8ee]/50 p-8 text-center">
                <p className="text-sm text-gray-600">No tags found.</p>
              </div>
            )}

            <div className="grid gap-4">
              {tags.map((tag) => {
                const isEditing = editingTag?.id === tag.id;
                return (
                  <div key={tag.id} className="rounded-lg border border-[#d4c7b4] bg-white/75 p-4 transition hover:shadow-md">
                    {isEditing && editingTag ? (
                      <div className="grid gap-2">
                        <input value={editingTag.name} onChange={(event) => setEditingTag({ ...editingTag, name: event.target.value })} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm" />
                        <div className="flex flex-wrap gap-2" aria-label="Tag color">
                          {(showAllEditTagColors ? TAG_COLOR_OPTIONS : TAG_COLOR_OPTIONS.slice(0, VISIBLE_TAG_COLOR_COUNT)).map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditingTag({ ...editingTag, color })}
                              style={{ backgroundColor: color }}
                              className={`h-9 w-9 rounded-full border transition hover:scale-105 ${editingTag.color === color ? "border-[#1f2320] ring-2 ring-[#1f2320]/20" : "border-[#d4c7b4]"}`}
                              aria-label={`Use tag color ${color}`}
                            />
                          ))}
                          {!showAllEditTagColors && (
                            <button
                              type="button"
                              onClick={() => setShowAllEditTagColors(true)}
                              className="h-9 w-9 rounded-full border border-dashed border-[#d05a2c]/45 bg-white text-sm font-semibold text-[#b24a20] transition hover:bg-[#fff0e8]"
                              aria-label="Show more tag colors"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveEditedTag(editingTag)} disabled={isSaving} className="rounded-lg bg-[#d05a2c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Save</button>
                          <button type="button" onClick={() => { setEditingTag(null); setShowAllEditTagColors(false); }} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-xs font-semibold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <span style={tagChipStyle(tag)} className="inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold text-gray-900">
                            {tag.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditingTag({ id: tag.id, name: tag.name, color: tag.color }); setShowAllEditTagColors(false); }} className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100">Edit</button>
                          <button type="button" onClick={() => removeTag(tag)} disabled={isSaving} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
