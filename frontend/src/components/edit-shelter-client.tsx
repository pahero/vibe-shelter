"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ApiErrorHandler } from "@/lib/utils";
import { CatArchivationReason, CatHistoryEvent, CatTag, Location, catsApi, locationsApi } from "@/lib/api";
import { eventLabels, historyValueText } from "@/components/cat-history";
import { UserRegistrationClient } from "@/components/user-registration-client";
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

type ShelterSection = "locations" | "tags" | "users" | "archivation" | "audit";

type CatCardOptions = {
  id: string;
  name: string;
};

const emptyLocation: LocationDraft = { name: "", description: "" };

function auditDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function EditShelterClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<CatTag[]>([]);
  const [archivationReasons, setArchivationReasons] = useState<CatArchivationReason[]>([]);
  const [newReasonName, setNewReasonName] = useState("");
  const [editingReason, setEditingReason] = useState<CatArchivationReason | null>(null);
  const [reasonToDelete, setReasonToDelete] = useState<CatArchivationReason | null>(null);
  const [replacementReasonId, setReplacementReasonId] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(emptyLocation);
  const [editingLocation, setEditingLocation] = useState<EditingLocation | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isAddingReason, setIsAddingReason] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null);
  const [showAllNewTagColors, setShowAllNewTagColors] = useState(false);
  const [showAllEditTagColors, setShowAllEditTagColors] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [auditEvents, setAuditEvents] = useState<CatHistoryEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditUser, setAuditUser] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditCatId, setAuditCatId] = useState("");
  const [auditCats, setAuditCats] = useState<CatCardOptions[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ShelterSection>("locations");

  useEffect(() => {
    void loadLocations();
  }, []);

  async function loadEditors() {
    await loadSection(activeSection);
  }

  async function loadSection(section: ShelterSection) {
    if (section === "locations") {
      await loadLocations();
      return;
    }
    if (section === "tags") {
      await loadTags();
      return;
    }
    if (section === "users") {
      return;
    }
    if (section === "archivation") {
      await loadArchivationReasons();
      return;
    }
    await Promise.all([loadAuditCats(), loadAudit()]);
  }

  async function loadLocations() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await locationsApi.listLocations({ limit: 100 });
      setLocations(response.data.filter((location) => location.status !== "ARCHIVED"));
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTags() {
    setIsLoading(true);
    setError(null);
    try {
      setTags(await catsApi.listTags());
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadArchivationReasons() {
    setIsLoading(true);
    setError(null);
    try {
      setArchivationReasons(await catsApi.listArchivationReasons());
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAuditCats() {
    try {
      const response = await catsApi.listCats({ limit: 100 });
      setAuditCats(response.data.map((cat) => ({ id: cat.id, name: cat.name })));
    } catch {
      setAuditCats([]);
    }
  }

  function selectSection(section: ShelterSection) {
    if (section === activeSection) return;
    setActiveSection(section);
    void loadSection(section);
  }
  async function loadAudit() {
    setIsLoadingAudit(true);
    setAuditError(null);
    try {
      const response = await catsApi.listAllHistory({
        user: auditUser.trim() || undefined,
        catId: auditCatId || undefined,
        from: auditFrom || undefined,
        to: auditTo || undefined,
        limit: 100,
      });
      setAuditEvents(response.data);
      setAuditTotal(response.total);
    } catch (err) {
      setAuditError(ApiErrorHandler.handle(err));
      setAuditEvents([]);
      setAuditTotal(0);
    } finally {
      setIsLoadingAudit(false);
    }
  }

  async function filterAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAudit();
  }

  async function clearAuditFilters() {
    setAuditUser("");
    setAuditCatId("");
    setAuditFrom("");
    setAuditTo("");
    setIsLoadingAudit(true);
    setAuditError(null);
    try {
      const response = await catsApi.listAllHistory({ limit: 100 });
      setAuditEvents(response.data);
      setAuditTotal(response.total);
    } catch (err) {
      setAuditError(ApiErrorHandler.handle(err));
      setAuditEvents([]);
      setAuditTotal(0);
    } finally {
      setIsLoadingAudit(false);
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
      setIsAddingLocation(false);
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
      setIsAddingTag(false);
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

  async function saveReason() {
    const name = (editingReason?.name ?? newReasonName).trim();
    if (!name) {
      setError("Archivation reason name is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingReason) await catsApi.updateArchivationReason(editingReason.id, name);
      else await catsApi.createArchivationReason(name);
      setEditingReason(null);
      setNewReasonName("");
      setIsAddingReason(false);
      setMessage(editingReason ? "Archivation reason updated." : "Archivation reason added.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeReason(reason: CatArchivationReason, replacementId?: string) {
    setIsSaving(true);
    setError(null);
    try {
      await catsApi.deleteArchivationReason(reason.id, replacementId);
      setReasonToDelete(null);
      setReplacementReasonId("");
      setMessage("Archivation reason removed.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  function startRemovingReason(reason: CatArchivationReason) {
    const replacement = archivationReasons.find((candidate) => candidate.id !== reason.id);
    setReasonToDelete(reason);
    setReplacementReasonId(replacement?.id ?? "");
    setError(null);
  }

  return (
    <section className="w-full max-w-6xl rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="mt-1 text-3xl font-semibold text-gray-900">Shelter management</h1>
        </div>
        <Link href="/" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white/60 px-4 text-sm font-semibold text-[#1f2320] transition hover:bg-white">
          Back to cats
        </Link>
      </div>

      {message && <p className="mt-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800">{message}</p>}
      {error && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      {isLoading && <p className="py-10 text-center text-sm text-[#6d6a66]">Loading editor...</p>}

      {!isLoading && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label="Shelter management sections" className="flex h-fit flex-col gap-2 rounded-2xl border border-[#d4c7b4] bg-white/55 p-2 lg:sticky lg:top-6">
            {[
              ["locations", "Locations"],
              ["tags", "Tags"],
              ["users", "Users"],
              ["archivation", "Archivation reasons"],
              ["audit", "Audit history"],
            ].map(([id, label]) => <button key={id} type="button" onClick={() => selectSection(id as ShelterSection)} className={`min-h-11 whitespace-nowrap rounded-xl px-3 text-left text-sm font-semibold transition ${activeSection === id ? "bg-[#d05a2c] text-white" : "text-[#1f2320] hover:bg-[#d05a2c]/10"}`}>{label}</button>)}
          </nav>
          <div className="min-w-0">
          {activeSection === "locations" && <section className="space-y-2 rounded-2xl border border-[#d4c7b4] bg-white/55 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Locations</h2>
              <button
                type="button"
                onClick={() => {
                  setIsAddingLocation((isOpen) => !isOpen);
                  setLocationDraft(emptyLocation);
                  setError(null);
                }}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingLocation ? "Cancel" : "+ New Location"}
              </button>
            </div>

            {isAddingLocation && (
              <form id="new-location-form" onSubmit={createLocation} className="grid gap-2 rounded-xl border border-[#d4c7b4] bg-[#fff8ee]/70 p-3">
                <input value={locationDraft.name} onChange={(event) => setLocationDraft((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="New location name" />
                <input value={locationDraft.description} onChange={(event) => setLocationDraft((prev) => ({ ...prev, description: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="Description" />
                <div className="flex gap-2">
                  <button disabled={isSaving} className="rounded-lg bg-[#d05a2c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Save</button>
                  <button type="button" onClick={() => { setIsAddingLocation(false); setLocationDraft(emptyLocation); }} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-xs font-semibold">Cancel</button>
                </div>
              </form>
            )}

            {locations.length === 0 && (
              <div className="rounded-lg border border-[#d4c7b4] bg-[#fff8ee]/50 p-8 text-center">
                <p className="text-sm text-gray-600">No locations found.</p>
              </div>
            )}

            <div className="grid gap-2">
              {locations.map((location) => {
                const isEditing = editingLocation?.id === location.id;
                return (
                  <div key={location.id} className="w-full rounded-lg border border-[#d4c7b4] bg-white/75 p-3 text-center transition hover:shadow-md">
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
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-gray-900">{location.name}</p>
                          {location.description && <p className="mt-1 text-sm text-[#6d6a66]">{location.description}</p>}
                          {location.ownerId && <p className="mt-2 text-xs text-gray-600"><strong>Owner:</strong> {location.ownerId.slice(0, 8)}...</p>}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => setEditingLocation({ id: location.id, name: location.name, description: location.description ?? "", status: location.status })} className="text-sm font-semibold text-amber-700 hover:text-amber-800">Edit</button>
                          <button type="button" onClick={() => removeLocation(location)} disabled={isSaving} className="text-sm font-semibold text-red-700 hover:text-red-800 disabled:opacity-60">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>}

          {activeSection === "tags" && <section className="space-y-2 rounded-2xl border border-[#d4c7b4] bg-white/55 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Tags</h2>
              <button type="button" onClick={() => { setIsAddingTag((isOpen) => !isOpen); setTagName(""); setTagColor(DEFAULT_TAG_COLOR); setShowAllNewTagColors(false); setError(null); }} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:opacity-60">{isAddingTag ? "Cancel" : "+ New Tag"}</button>
            </div>
            <div className="grid gap-2">
              {isAddingTag && <div className="order-2 rounded-xl border border-[#d4c7b4] bg-[#fff8ee]/70 p-3">
                <div className="hidden">
              <button
                type="button"
                onClick={() => {
                  setIsAddingTag((isOpen) => !isOpen);
                  setTagName("");
                  setTagColor(DEFAULT_TAG_COLOR);
                  setShowAllNewTagColors(false);
                  setError(null);
                }}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingTag ? "Cancel" : "+ New Tag"}
              </button>
                </div>

            {isAddingTag && (
              <form id="tag-form" onSubmit={saveTag} className="grid gap-2">
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
                <div className="flex gap-2">
                  <button disabled={isSaving} className="rounded-lg bg-[#d05a2c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Save</button>
                  <button type="button" onClick={() => { setIsAddingTag(false); setTagName(""); setTagColor(DEFAULT_TAG_COLOR); setShowAllNewTagColors(false); }} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-xs font-semibold">Cancel</button>
                </div>
              </form>
            )}
              </div>}

              <div className="order-1">
            {tags.length === 0 && (
              <div className="mt-2 rounded-lg border border-[#d4c7b4] bg-[#fff8ee]/50 p-8 text-center">
                <p className="text-sm text-gray-600">No tags found.</p>
              </div>
            )}

            <div className="grid gap-2">
              {tags.map((tag) => {
                const isEditing = editingTag?.id === tag.id;
                return (
                  <div key={tag.id} className="w-full rounded-lg border border-[#d4c7b4] bg-white/75 p-3 text-center transition hover:shadow-md">
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
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span style={tagChipStyle(tag)} className="inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold text-gray-900">
                            {tag.name}
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => { setEditingTag({ id: tag.id, name: tag.name, color: tag.color }); setShowAllEditTagColors(false); }} className="text-sm font-semibold text-amber-700 hover:text-amber-800">Edit</button>
                          <button type="button" onClick={() => removeTag(tag)} disabled={isSaving} className="text-sm font-semibold text-red-700 hover:text-red-800 disabled:opacity-60">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              </div>
            </div>
          </section>}

          {activeSection === "users" && <UserRegistrationClient />}


          {activeSection === "archivation" && <section className="space-y-2 rounded-2xl border border-[#d4c7b4] bg-white/55 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Archivation reasons</h2>
              <button type="button" onClick={() => { setIsAddingReason((isOpen) => !isOpen); setNewReasonName(""); setError(null); }} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:opacity-60">{isAddingReason ? "Cancel" : "+ New Reason"}</button>
            </div>
            <div className="grid gap-2">
              {isAddingReason && <div className="order-2 rounded-xl border border-[#d4c7b4] bg-[#fff8ee]/70 p-3">
                <p className="text-sm font-semibold text-gray-900">Add a reason</p>
                <div className="mt-2 flex gap-2">
                  <input value={newReasonName} onChange={(event) => setNewReasonName(event.target.value)} placeholder="New reason" className="min-w-0 flex-1 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm" />
                  <button type="button" onClick={saveReason} disabled={isSaving} className="rounded-lg bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Add</button>
                </div>
              </div>}
              <div className="order-1">
                {archivationReasons.length === 0 && <p className="mt-2 text-sm text-gray-600">No archivation reasons found.</p>}
                <div className="grid gap-2">
                {archivationReasons.map((reason) => (
                <div key={reason.id} className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#d4c7b4] bg-white/75 p-3">
                  {editingReason?.id === reason.id ? (
                    <input value={editingReason.name} onChange={(event) => setEditingReason({ ...editingReason, name: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm" />
                  ) : <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{reason.name}</span>}
                  {editingReason?.id === reason.id ? <>
                    <button type="button" onClick={saveReason} disabled={isSaving} className="text-sm font-semibold text-[#b24a20]">Save</button>
                    <button type="button" onClick={() => setEditingReason(null)} className="text-sm font-semibold text-gray-600">Cancel</button>
                  </> : <>
                    <button type="button" onClick={() => setEditingReason(reason)} className="text-sm font-semibold text-amber-700">Edit</button>
                    <button type="button" onClick={() => startRemovingReason(reason)} disabled={isSaving} className="text-sm font-semibold text-red-700 disabled:opacity-60">Remove</button>
                  </>}
                </div>
              ))}
                </div>
              </div>
            </div>
            {reasonToDelete && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-gray-900">Remove &quot;{reasonToDelete.name}&quot;</p>
                <label className="mt-2 grid gap-1 text-sm text-gray-700">Replacement for assigned cats
                  <select value={replacementReasonId} onChange={(event) => setReplacementReasonId(event.target.value)} disabled={archivationReasons.length < 2} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 disabled:opacity-60">
                    {archivationReasons.filter((reason) => reason.id !== reasonToDelete.id).map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                  </select>
                </label>
                {archivationReasons.length < 2 && <p className="mt-2 text-sm text-red-700">Add another reason before removing one assigned to cats.</p>}
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => removeReason(reasonToDelete, replacementReasonId || undefined)} disabled={isSaving} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Removing..." : "Confirm removal"}</button>
                  <button type="button" onClick={() => { setReasonToDelete(null); setReplacementReasonId(""); }} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
          </section>}
       

       {activeSection === "audit" && <section className="rounded-2xl border border-[#d4c7b4] bg-white/55 p-4">
         <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Audit history</p>
            <form onSubmit={filterAudit} className="mt-4 flex flex-wrap gap-2">
              <input value={auditUser} onChange={(event) => setAuditUser(event.target.value)} placeholder="User name or email" className="w-48 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" aria-label="Filter by user" />
              <select value={auditCatId} onChange={(event) => setAuditCatId(event.target.value)} className="w-48 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" aria-label="Filter by cat">
                <option value="">All cats</option>
                {auditCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input type="date" value={auditFrom} onChange={(event) => setAuditFrom(event.target.value)} aria-label="From date" className="w-36 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
              <input type="date" value={auditTo} onChange={(event) => setAuditTo(event.target.value)} aria-label="To date" className="w-36 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
              <button type="submit" disabled={isLoadingAudit} className="rounded-lg bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Filter</button>
              <button type="button" onClick={clearAuditFilters} disabled={isLoadingAudit} className="rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-semibold text-[#6d6a66] disabled:opacity-60">Clear filters</button>
            </form>

            {auditError && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{auditError}</p>}
            {isLoadingAudit && <p className="py-8 text-center text-sm text-[#6d6a66]">Loading audit history...</p>}

            {!isLoadingAudit && !auditError && auditEvents.length === 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-[#d4c7b4] bg-[#fff8ee]/50 p-6 text-center">
                <p className="text-sm text-[#6d6a66]">No audit records found.</p>
              </div>
            )}

            {!isLoadingAudit && !auditError && auditEvents.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-[#6d6a66]">Showing {auditEvents.length} of {auditTotal}</p>
                <ol className="mt-3 divide-y divide-[#d4c7b4] border-y border-[#d4c7b4]">
                  {auditEvents.map((event) => (
                    <li key={event.id} className="py-2.5">
                      <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <p className="min-w-0 text-gray-800">
                          <span className="font-semibold text-gray-900">{eventLabels[event.eventType] ?? event.eventType}</span>
                          <span className="text-[#6d6a66]">{event.catName ? ` on ${event.catName}` : ""} by {event.actor.displayName || event.actor.email}</span>
                        </p>
                        <time className="shrink-0 text-xs font-medium text-[#6d6a66]">{auditDateLabel(event.occurredAt)}</time>
                      </div>
                      {event.photo ? (
                        <p className="mt-1 text-xs">
                          <a className="font-semibold text-[#b24a20] underline-offset-2 hover:underline" href={event.photo.link ?? "#"} target="_blank" rel="noreferrer">
                            {event.photo.status === "DELETED" ? "Open historical deleted-photo link" : "Open photo link"}
                          </a>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[#6d6a66]">{historyValueText(event.oldValue)} -&gt; {historyValueText(event.newValue)}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
        </section>}
          </div>
        </div>
       )}
    </section>
  );
}
