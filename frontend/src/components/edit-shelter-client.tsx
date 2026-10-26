"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBoxArchive, faClockRotateLeft, faLocationDot, faPen, faPlus, faTags, faTrash, faUsers, faXmark } from "@fortawesome/free-solid-svg-icons";
import { ApiErrorHandler } from "@/lib/utils";
import { CatArchivingReason, CatHistoryEvent, CatTag, Location, catsApi, locationsApi } from "@/lib/api";
import { auditEventLabel, historyValueText } from "@/components/cat-history";
import { UserRegistrationClient } from "@/components/user-registration-client";
import { AddNewButton } from "@/components/add-new-button";
import { PaginationControls } from "@/components/pagination-controls";
import { AdminUser, fetchAdminUsers } from "@/lib/backend";
import { DEFAULT_TAG_COLOR, TAG_COLOR_OPTIONS, VISIBLE_TAG_COLOR_COUNT, tagChipStyle } from "@/lib/tag-colors";

const primaryButtonClass = "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass = "inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white px-4 text-sm font-semibold text-[#1f2320] transition hover:bg-[#fff8ee] disabled:cursor-not-allowed disabled:opacity-60";
const addButtonClass = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60";
const pageSize = 20;

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

type ShelterSection = "locations" | "tags" | "users" | "archiving" | "audit";

type CatCardOptions = {
  id: string;
  name: string;
  nameNumber: number;
};

const emptyLocation: LocationDraft = { name: "", description: "" };

function auditDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function EditShelterClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<CatTag[]>([]);
  const [archivingReasons, setArchivingReasons] = useState<CatArchivingReason[]>([]);
  const [newReasonName, setNewReasonName] = useState("");
  const [editingReason, setEditingReason] = useState<CatArchivingReason | null>(null);
  const [reasonToDelete, setReasonToDelete] = useState<CatArchivingReason | null>(null);
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
  const [auditUsers, setAuditUsers] = useState<AdminUser[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ShelterSection>("locations");
  const [sectionPages, setSectionPages] = useState<Record<"locations" | "tags" | "archiving" | "audit", number>>({ locations: 1, tags: 1, archiving: 1, audit: 1 });

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
    if (section === "archiving") {
      await loadArchivingReasons();
      return;
    }
    await Promise.all([loadAuditCats(), loadAudit()]);
  }

  async function loadLocations() {
    setIsLoading(true);
    setError(null);
    try {
      const pageLimit = 100;
      const firstPage = await locationsApi.listLocations({ skip: 0, limit: pageLimit });
      const allLocations = [...firstPage.data];
      for (let skip = firstPage.data.length; skip < firstPage.total; skip += pageLimit) {
        const response = await locationsApi.listLocations({ skip, limit: pageLimit });
        allLocations.push(...response.data);
        if (response.data.length === 0) break;
      }
      setLocations(allLocations.filter((location) => location.status !== "ARCHIVED"));
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

  async function loadArchivingReasons() {
    setIsLoading(true);
    setError(null);
    try {
      setArchivingReasons(await catsApi.listArchivingReasons());
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAuditCats() {
    try {
      const [response, users] = await Promise.all([catsApi.listCats({ limit: 100 }), fetchAdminUsers()]);
      setAuditCats(response.data.map((cat) => ({ id: cat.id, name: cat.name, nameNumber: cat.nameNumber })));
      setAuditUsers(users);
    } catch {
      setAuditCats([]);
      setAuditUsers([]);
    }
  }

  function selectSection(section: ShelterSection) {
    if (section === activeSection) return;
    setActiveSection(section);
    void loadSection(section);
  }
  function changePage(section: "locations" | "tags" | "archiving" | "audit", page: number) {
    setSectionPages((current) => ({ ...current, [section]: page }));
  }
  async function loadAudit(page = sectionPages.audit) {
    setIsLoadingAudit(true);
    setAuditError(null);
    try {
      const response = await catsApi.listAllHistory({
        user: auditUser.trim() || undefined,
        catId: auditCatId || undefined,
        from: auditFrom || undefined,
        to: auditTo || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
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
    changePage("audit", 1);
    await loadAudit(1);
  }

  async function clearAuditFilters() {
    setAuditUser("");
    setAuditCatId("");
    setAuditFrom("");
    setAuditTo("");
    setIsLoadingAudit(true);
    setAuditError(null);
    try {
      changePage("audit", 1);
      const response = await catsApi.listAllHistory({ limit: pageSize });
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

  function changeAuditPage(page: number) {
    changePage("audit", page);
    void loadAudit(page);
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
      setError("Archiving reason name is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingReason) await catsApi.updateArchivingReason(editingReason.id, name);
      else await catsApi.createArchivingReason(name);
      setEditingReason(null);
      setNewReasonName("");
      setIsAddingReason(false);
      setMessage(editingReason ? "Archiving reason updated." : "Archiving reason added.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeReason(reason: CatArchivingReason, replacementId?: string) {
    setIsSaving(true);
    setError(null);
    try {
      await catsApi.deleteArchivingReason(reason.id, replacementId);
      setReasonToDelete(null);
      setReplacementReasonId("");
      setMessage("Archiving reason removed.");
      await loadEditors();
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsSaving(false);
    }
  }

  function startRemovingReason(reason: CatArchivingReason) {
    const replacement = archivingReasons.find((candidate) => candidate.id !== reason.id);
    setReasonToDelete(reason);
    setReplacementReasonId(replacement?.id ?? "");
    setError(null);
  }

  return (
    <>
      <Link href="/" aria-label="Back to cats" title="Back to cats" className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /></Link>
      <main className="mx-auto w-full max-w-xl">

      {message && <p className="mt-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800">{message}</p>}
      {error && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      {isLoading && <p className="py-10 text-center text-sm text-[#6d6a66]">Loading editor...</p>}

      {!isLoading && (
        <div className="mt-2 min-w-0">
          {activeSection === "locations" && <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
              <AddNewButton
                label="Add location"
                onClick={() => {
                  setIsAddingLocation((isOpen) => !isOpen);
                  setLocationDraft(emptyLocation);
                  setError(null);
                }}
                disabled={isSaving}
                className={addButtonClass}
              />
            </div>

            {isAddingLocation && (
              <form id="new-location-form" onSubmit={createLocation} className="grid gap-2 rounded-xl border border-[#d4c7b4] bg-[#fff8ee]/70 p-3">
                <input value={locationDraft.name} onChange={(event) => setLocationDraft((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="New location name" />
                <input value={locationDraft.description} onChange={(event) => setLocationDraft((prev) => ({ ...prev, description: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="Description" />
                <div className="flex gap-2">
                  <button disabled={isSaving} className={primaryButtonClass}>Save</button>
                  <button type="button" onClick={() => { setIsAddingLocation(false); setLocationDraft(emptyLocation); }} className={secondaryButtonClass}>Cancel</button>
                </div>
              </form>
            )}

            {locations.length === 0 && (
              <div className="rounded-lg border border-[#d4c7b4] bg-[#fff8ee]/50 p-8 text-center">
                <p className="text-sm text-gray-600">No locations found.</p>
              </div>
            )}

            <div className="grid gap-2">
              {locations.slice((sectionPages.locations - 1) * pageSize, sectionPages.locations * pageSize).map((location) => {
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
                          <button type="button" onClick={() => saveLocation(editingLocation)} disabled={isSaving} className={primaryButtonClass}>Save</button>
                          <button type="button" onClick={() => setEditingLocation(null)} className={secondaryButtonClass}>Cancel</button>
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
                          <button type="button" onClick={() => setEditingLocation({ id: location.id, name: location.name, description: location.description ?? "", status: location.status })} aria-label={`Edit ${location.name}`} title={`Edit ${location.name}`} className="rounded-lg p-2 text-amber-700 hover:bg-amber-50 hover:text-amber-800"><FontAwesomeIcon icon={faPen} /></button>
                          <button type="button" onClick={() => removeLocation(location)} disabled={isSaving} aria-label={`Remove ${location.name}`} title={`Remove ${location.name}`} className="rounded-lg p-2 text-red-700 hover:bg-red-50 hover:text-red-800 disabled:opacity-60"><FontAwesomeIcon icon={faTrash} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <PaginationControls page={sectionPages.locations} pageSize={pageSize} totalItems={locations.length} onPageChange={(page) => changePage("locations", page)} />
          </section>}

          {activeSection === "tags" && <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">Tags</h1>
              <AddNewButton label={isAddingTag ? "Cancel adding tag" : "Add tag"} isOpen={isAddingTag} onClick={() => { setIsAddingTag((isOpen) => !isOpen); setTagName(""); setTagColor(DEFAULT_TAG_COLOR); setShowAllNewTagColors(false); setError(null); }} disabled={isSaving} className={addButtonClass} />
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
                  <button disabled={isSaving} className={primaryButtonClass}>Save</button>
                  <button type="button" onClick={() => { setIsAddingTag(false); setTagName(""); setTagColor(DEFAULT_TAG_COLOR); setShowAllNewTagColors(false); }} className={secondaryButtonClass}>Cancel</button>
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
              {tags.slice((sectionPages.tags - 1) * pageSize, sectionPages.tags * pageSize).map((tag) => {
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
                          <button type="button" onClick={() => saveEditedTag(editingTag)} disabled={isSaving} className={primaryButtonClass}>Save</button>
                          <button type="button" onClick={() => { setEditingTag(null); setShowAllEditTagColors(false); }} className={secondaryButtonClass}>Cancel</button>
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
                          <button type="button" onClick={() => { setEditingTag({ id: tag.id, name: tag.name, color: tag.color }); setShowAllEditTagColors(false); }} aria-label={`Edit ${tag.name}`} title={`Edit ${tag.name}`} className="rounded-lg p-2 text-amber-700 hover:bg-amber-50 hover:text-amber-800"><FontAwesomeIcon icon={faPen} /></button>
                          <button type="button" onClick={() => removeTag(tag)} disabled={isSaving} aria-label={`Remove ${tag.name}`} title={`Remove ${tag.name}`} className="rounded-lg p-2 text-red-700 hover:bg-red-50 hover:text-red-800 disabled:opacity-60"><FontAwesomeIcon icon={faTrash} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <PaginationControls page={sectionPages.tags} pageSize={pageSize} totalItems={tags.length} onPageChange={(page) => changePage("tags", page)} />
              </div>
            </div>
          </section>}

          {activeSection === "users" && <UserRegistrationClient />}


          {activeSection === "archiving" && <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">Archiving reasons</h1>
              <button type="button" onClick={() => { setIsAddingReason((isOpen) => !isOpen); setNewReasonName(""); setError(null); }} disabled={isSaving} aria-label={isAddingReason ? "Close add reason form" : "Add archiving reason"} title={isAddingReason ? "Close add reason form" : "Add archiving reason"} className={addButtonClass}><FontAwesomeIcon icon={isAddingReason ? faXmark : faPlus} aria-hidden="true" /></button>
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
                {archivingReasons.length === 0 && <p className="mt-2 text-sm text-gray-600">No archiving reasons found.</p>}
                <div className="grid gap-2">
                {archivingReasons.slice((sectionPages.archiving - 1) * pageSize, sectionPages.archiving * pageSize).map((reason) => (
                <div key={reason.id} className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#d4c7b4] bg-white/75 p-3">
                  {editingReason?.id === reason.id ? (
                    <input value={editingReason.name} onChange={(event) => setEditingReason({ ...editingReason, name: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm" />
                  ) : <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{reason.name}</span>}
                  {editingReason?.id === reason.id ? <>
                    <button type="button" onClick={saveReason} disabled={isSaving} className="text-sm font-semibold text-[#b24a20]">Save</button>
                    <button type="button" onClick={() => setEditingReason(null)} className="text-sm font-semibold text-gray-600">Cancel</button>
                  </> : <>
                     <button type="button" onClick={() => setEditingReason(reason)} aria-label={`Edit ${reason.name}`} title={`Edit ${reason.name}`} className="rounded-lg p-2 text-amber-700 hover:bg-amber-50"><FontAwesomeIcon icon={faPen} /></button>
                     <button type="button" onClick={() => startRemovingReason(reason)} disabled={isSaving} aria-label={`Remove ${reason.name}`} title={`Remove ${reason.name}`} className="rounded-lg p-2 text-red-700 hover:bg-red-50 disabled:opacity-60"><FontAwesomeIcon icon={faTrash} /></button>
                  </>}
                </div>
              ))}
                </div>
              </div>
            </div>
            <PaginationControls page={sectionPages.archiving} pageSize={pageSize} totalItems={archivingReasons.length} onPageChange={(page) => changePage("archiving", page)} />
            {reasonToDelete && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-gray-900">Remove &quot;{reasonToDelete.name}&quot;</p>
                <label className="mt-2 grid gap-1 text-sm text-gray-700">Replacement for assigned cats
                  <select value={replacementReasonId} onChange={(event) => setReplacementReasonId(event.target.value)} disabled={archivingReasons.length < 2} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 disabled:opacity-60">
                    {archivingReasons.filter((reason) => reason.id !== reasonToDelete.id).map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                  </select>
                </label>
                {archivingReasons.length < 2 && <p className="mt-2 text-sm text-red-700">Add another reason before removing one assigned to cats.</p>}
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => removeReason(reasonToDelete, replacementReasonId || undefined)} disabled={isSaving} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Removing..." : "Confirm removal"}</button>
                  <button type="button" onClick={() => { setReasonToDelete(null); setReplacementReasonId(""); }} className="rounded-lg border border-[#d4c7b4] px-3 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
          </section>}
       

       {activeSection === "audit" && <section>
         <h1 className="text-2xl font-semibold text-gray-900">Audit history</h1>
            <form onSubmit={filterAudit} className="mt-4 flex flex-wrap gap-2">
              <select value={auditUser} onChange={(event) => setAuditUser(event.target.value)} className="w-48 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" aria-label="Filter by user">
                <option value="">All users</option>
                {auditUsers.map((user) => <option key={user.id} value={user.email}>{user.fullName ? `${user.fullName} (${user.email})` : user.email}</option>)}
              </select>
              <select value={auditCatId} onChange={(event) => setAuditCatId(event.target.value)} className="w-48 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" aria-label="Filter by cat">
                <option value="">All cats</option>
                {auditCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name} #{cat.nameNumber}</option>
                ))}
              </select>
              <div className="flex basis-full flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs font-medium text-[#6d6a66]">From date<input type="date" value={auditFrom} onChange={(event) => setAuditFrom(event.target.value)} aria-label="From date" className="w-36 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm text-[#1f2320] focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" /></label>
                <label className="grid gap-1 text-xs font-medium text-[#6d6a66]">To date<input type="date" value={auditTo} onChange={(event) => setAuditTo(event.target.value)} aria-label="To date" className="w-36 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm text-[#1f2320] focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" /></label>
              </div>
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
                <p className="text-xs font-medium text-[#6d6a66]">Showing {(sectionPages.audit - 1) * pageSize + 1}–{(sectionPages.audit - 1) * pageSize + auditEvents.length} of {auditTotal}</p>
                <ol className="mt-3 divide-y divide-[#d4c7b4] border-y border-[#d4c7b4]">
                  {auditEvents.map((event) => (
                    <li key={event.id} className="py-2.5">
                      <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <p className="min-w-0 text-gray-800">
                          <span className="font-semibold text-gray-900">{auditEventLabel(event)}</span>
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
                <PaginationControls page={sectionPages.audit} pageSize={pageSize} totalItems={auditTotal} onPageChange={changeAuditPage} />
              </div>
            )}
        </section>}
        </div>
      )}
      </main>
      <nav aria-label="Shelter management sections" className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-[#d4c7b4] bg-[#fff8ee]/95 p-2 shadow-xl backdrop-blur-md md:p-2.5">
        <div className="flex items-center gap-1 md:gap-2">
          {([["locations", "Locations", faLocationDot], ["tags", "Tags", faTags], ["users", "Users", faUsers], ["archiving", "Archiving reasons", faBoxArchive], ["audit", "Audit history", faClockRotateLeft]] as const).map(([id, label, icon]) => <button key={id} type="button" onClick={() => selectSection(id)} aria-label={label} title={label} aria-current={activeSection === id ? "location" : undefined} className={`flex h-10 w-10 items-center justify-center rounded-xl transition md:h-11 md:w-11 ${activeSection === id ? "bg-[#d05a2c]/15 text-[#b24a20]" : "text-gray-800 hover:bg-[#d05a2c]/10 hover:text-[#b24a20]"}`}><FontAwesomeIcon icon={icon} aria-hidden="true" /></button>)}
        </div>
      </nav>
    </>
  );
}
