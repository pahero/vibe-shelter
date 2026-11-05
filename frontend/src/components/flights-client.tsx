"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  faArrowLeft,
  faBoxArchive,
  faPen,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ContextMenu } from "@/components/context-menu";
import { MediaThumbnail } from "@/components/media-thumbnail";
import { MediaThumbnailGrid } from "@/components/media-thumbnail-grid";
import { ApiErrorHandler, formatDateShort } from "@/lib/utils";
import {
  catsApi,
  CatCard,
  CatHistoryEvent,
  FlightDetails,
  FlightInput,
  FlightListItem,
  FlightPhoto,
  flightsApi,
} from "@/lib/api";
import { CatHistory } from "@/components/cat-history";

function emptyFlightForm(): FlightInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    airport: "",
    flightNumber: "",
    flightParent: "",
    comment: "",
  };
}

export function FlightsClient({
  standaloneFlightId,
}: { standaloneFlightId?: string } = {}) {
  const [flights, setFlights] = useState<FlightListItem[]>([]);
  const [deletedFlights, setDeletedFlights] = useState<FlightListItem[]>([]);
  const [cats, setCats] = useState<CatCard[]>([]);
  const [flightCandidateIds, setFlightCandidateIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightDetails | null>(
    null,
  );
  const [flightHistory, setFlightHistory] = useState<CatHistoryEvent[]>([]);
  const [flightHistoryTotal, setFlightHistoryTotal] = useState(0);
  const [isLoadingFlight, setIsLoadingFlight] = useState(false);
  const [isDeletedSelection, setIsDeletedSelection] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FlightInput>(emptyFlightForm);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [assignmentActionId, setAssignmentActionId] = useState<string | null>(
    null,
  );
  const [flightActionId, setFlightActionId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<FlightPhoto[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoActionId, setPhotoActionId] = useState<string | null>(null);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [thumbnailPhotoMenuId, setThumbnailPhotoMenuId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      flightsApi.list(),
      flightsApi.list(true),
      catsApi.listCats({ limit: 100 }),
      catsApi.listFlightCandidateIds(),
    ])
      .then(([active, deleted, catResponse, candidates]) => {
        if (cancelled) return;
        setFlights(active);
        setDeletedFlights(deleted);
        setCats(catResponse.data);
        setFlightCandidateIds(new Set(candidates.map(({ id }) => id)));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setLoadingError(ApiErrorHandler.handle(reason));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!standaloneFlightId) return;
    let cancelled = false;
    setIsLoadingFlight(true);
    const loadStandaloneFlight = async () => {
      try {
        const [detail, history] = await Promise.all([
          flightsApi.get(standaloneFlightId),
          flightsApi.history(standaloneFlightId),
        ]);
        if (cancelled) return;
        setSelectedFlightId(standaloneFlightId);
        setSelectedFlight(detail);
        setFlightHistory(history.data);
        setFlightHistoryTotal(history.total);
        setIsDeletedSelection(false);
      } catch (activeReason) {
        try {
          const deletedFlights = await flightsApi.list(true);
          const deletedFlight = deletedFlights.find(
            ({ id }) => id === standaloneFlightId,
          );
          if (!deletedFlight) throw activeReason;
          const history = await flightsApi.history(standaloneFlightId);
          if (cancelled) return;
          setSelectedFlightId(standaloneFlightId);
          setSelectedFlight({
            id: deletedFlight.id,
            date: deletedFlight.date,
            airport: deletedFlight.airport,
            flightNumber: deletedFlight.flightNumber,
            flightParent: deletedFlight.flightParent,
            comment: deletedFlight.comment,
            updatedAt: "",
            cats: [],
          });
          setFlightHistory(history.data);
          setFlightHistoryTotal(history.total);
          setIsDeletedSelection(true);
        } catch (reason) {
          if (!cancelled) setActionError(ApiErrorHandler.handle(reason));
        }
      }
      if (!cancelled) setIsLoadingFlight(false);
    };
    void loadStandaloneFlight();
    return () => {
      cancelled = true;
    };
  }, [standaloneFlightId]);

  useEffect(() => {
    if (!selectedFlightId || isDeletedSelection) {
      setPhotos([]);
      return;
    }
    let cancelled = false;
    flightsApi
      .listPhotos(selectedFlightId)
      .then((items) => {
        if (!cancelled) setPhotos(items);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setActionError(ApiErrorHandler.handle(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFlightId, isDeletedSelection]);

  const refreshLists = () => {
    setIsLoading(true);
    setLoadingError(null);
    setRefreshKey((value) => value + 1);
  };

  const loadFlight = async (flight: FlightListItem, deleted: boolean) => {
    setSelectedFlightId(flight.id);
    setIsDeletedSelection(deleted);
    setIsLoadingFlight(true);
    setActionError(null);
    setIsEditing(false);
    setIsFormOpen(false);
    try {
      if (deleted) {
        setSelectedFlight({
          id: flight.id,
          date: flight.date,
          airport: flight.airport,
          flightNumber: flight.flightNumber,
          flightParent: flight.flightParent,
          comment: flight.comment,
          updatedAt: "",
          cats: [],
        });
        const history = await flightsApi.history(flight.id);
        setFlightHistory(history.data);
        setFlightHistoryTotal(history.total);
      } else {
        const [detail, history] = await Promise.all([
          flightsApi.get(flight.id),
          flightsApi.history(flight.id),
        ]);
        setSelectedFlight(detail);
        setFlightHistory(history.data);
        setFlightHistoryTotal(history.total);
      }
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setIsLoadingFlight(false);
    }
  };

  const refreshSelectedFlight = async () => {
    if (!selectedFlightId) return;
    const flightListItem = [...flights, ...deletedFlights].find(
      (flight) => flight.id === selectedFlightId,
    );
    if (flightListItem) await loadFlight(flightListItem, isDeletedSelection);
    refreshLists();
  };

  const startCreate = () => {
    setSelectedFlightId(null);
    setSelectedFlight(null);
    setFlightHistory([]);
    setFlightHistoryTotal(0);
    setIsEditing(false);
    setForm(emptyFlightForm());
    setIsFormOpen(true);
    setActionError(null);
  };

  const startEdit = () => {
    if (!selectedFlight) return;
    setForm({
      date: selectedFlight.date,
      airport: selectedFlight.airport,
      flightNumber: selectedFlight.flightNumber,
      flightParent: selectedFlight.flightParent,
      comment: selectedFlight.comment,
    });
    setIsEditing(true);
    setIsFormOpen(true);
    setActionError(null);
  };

  const saveFlight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.date || !form.airport.trim()) {
      setActionError("Enter the date and airport.");
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      const payload = {
        ...form,
        airport: form.airport.trim(),
        flightNumber: form.flightNumber?.trim() || null,
        flightParent: form.flightParent?.trim() || null,
        comment: form.comment?.trim() || null,
      };
      if (isEditing && selectedFlightId) {
        await flightsApi.update(selectedFlightId, payload);
        const current = [...flights, ...deletedFlights].find(
          (item) => item.id === selectedFlightId,
        );
        if (current) await loadFlight({ ...current, ...payload }, false);
      } else {
        const result = await flightsApi.create(payload);
        const createdFlight: FlightListItem = {
          id: result.id,
          ...payload,
          deletedAt: null,
          catCount: 0,
        };
        await loadFlight(createdFlight, false);
      }
      setIsFormOpen(false);
      setIsEditing(false);
      refreshLists();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setIsSaving(false);
    }
  };

  const removeFlight = async () => {
    if (!selectedFlightId) return;
    setFlightActionId(selectedFlightId);
    setActionError(null);
    try {
      await flightsApi.delete(selectedFlightId);
      if (standaloneFlightId && selectedFlight) {
        await loadFlight(
          {
            ...selectedFlight,
            deletedAt: new Date().toISOString(),
            catCount: selectedFlight.cats.length,
          },
          true,
        );
      } else {
        setSelectedFlightId(null);
        setSelectedFlight(null);
        setFlightHistory([]);
        setFlightHistoryTotal(0);
      }
      refreshLists();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setFlightActionId(null);
    }
  };

  const addPhotos = async (files: FileList | null) => {
    if (!selectedFlightId || !files?.length) return;
    setIsUploadingPhotos(true);
    setActionError(null);
    try {
      await Promise.all(
        Array.from(files).map((file) =>
          flightsApi.addPhoto(selectedFlightId, file),
        ),
      );
      setPhotos(await flightsApi.listPhotos(selectedFlightId));
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const removePhoto = async (photoId: string) => {
    if (!selectedFlightId) return;
    setPhotoActionId(photoId);
    setActionError(null);
    try {
      await flightsApi.deletePhoto(selectedFlightId, photoId);
      setPhotos((items) => items.filter((photo) => photo.id !== photoId));
      if (expandedPhotoId === photoId) setExpandedPhotoId(null);
      setIsPhotoMenuOpen(false);
      setThumbnailPhotoMenuId(null);
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setPhotoActionId(null);
    }
  };

  const restoreFlight = async (flightId: string) => {
    setFlightActionId(flightId);
    setActionError(null);
    try {
      await flightsApi.restore(flightId);
      if (selectedFlightId === flightId) {
        setSelectedFlightId(null);
        setSelectedFlight(null);
        setFlightHistory([]);
        setFlightHistoryTotal(0);
      }
      refreshLists();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setFlightActionId(null);
    }
  };

  const assignCat = async () => {
    if (!selectedFlightId || !selectedCatId) return;
    setAssignmentActionId("new");
    setActionError(null);
    try {
      await flightsApi.assignCat(selectedFlightId, selectedCatId);
      setSelectedCatId("");
      await refreshSelectedFlight();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setAssignmentActionId(null);
    }
  };

  const updateAssignment = async (
    assignmentId: string,
    values: { f2fDone?: boolean; tracesDone?: boolean },
  ) => {
    setAssignmentActionId(assignmentId);
    setActionError(null);
    try {
      await flightsApi.updateAssignment(assignmentId, values);
      await refreshSelectedFlight();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setAssignmentActionId(null);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    setAssignmentActionId(assignmentId);
    setActionError(null);
    try {
      await flightsApi.deleteAssignment(assignmentId);
      await refreshSelectedFlight();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setAssignmentActionId(null);
    }
  };

  const visibleFlights = showDeleted ? deletedFlights : flights;
  const assignedCatIds = new Set(
    selectedFlight?.cats.map(({ cat }) => cat.id) ?? [],
  );
  const availableCats = cats.filter(
    (cat) =>
      flightCandidateIds.has(cat.id) &&
      !cat.archivedAt &&
      !assignedCatIds.has(cat.id),
  );
  const sortedPhotos = [...photos].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  const expandedPhotoIndex = expandedPhotoId
    ? sortedPhotos.findIndex((photo) => photo.id === expandedPhotoId)
    : -1;
  const expandedPhoto =
    expandedPhotoIndex >= 0 ? sortedPhotos[expandedPhotoIndex] : null;
  const hasMultiplePhotos = sortedPhotos.length > 1;
  const showPreviousPhoto = () => {
    if (expandedPhotoIndex < 0 || !hasMultiplePhotos) return;
    setIsPhotoMenuOpen(false);
    setExpandedPhotoId(
      sortedPhotos[
        (expandedPhotoIndex - 1 + sortedPhotos.length) % sortedPhotos.length
      ].id,
    );
  };
  const showNextPhoto = () => {
    if (expandedPhotoIndex < 0 || !hasMultiplePhotos) return;
    setIsPhotoMenuOpen(false);
    setExpandedPhotoId(
      sortedPhotos[(expandedPhotoIndex + 1) % sortedPhotos.length].id,
    );
  };
  const deletedFlightCats: FlightDetails["cats"] = [];

  return (
    <section
      className={`w-full max-w-6xl animate-rise ${standaloneFlightId ? "relative" : "rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:p-8"}`}
    >
      {standaloneFlightId && (
        <Link
          href="/flights"
          aria-label="Back to flights"
          title="Back to flights"
          className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
        >
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
        </Link>
      )}
      {!standaloneFlightId && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">
                Travel planning
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-gray-900">
                Flights
              </h1>
              <p className="mt-2 text-sm text-[#6d6a66]">
                Manage flight details, assigned cats, fit-to-fly checks, traces,
                and audit history.
              </p>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl bg-[#d05a2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b24a20]"
            >
              Add flight
            </button>
          </div>
        </>
      )}

      {loadingError && (
        <p
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800"
          role="alert"
        >
          {loadingError}
        </p>
      )}
      {actionError && (
        <p
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {isFormOpen && (
        <form
          onSubmit={saveFlight}
          className="mt-5 rounded-2xl border border-[#d4c7b4] bg-white/60 p-4"
        >
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {isEditing ? "Edit flight" : "Add flight"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>
                Date <span className="text-red-700">*</span>
              </span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>
                Airport <span className="text-red-700">*</span>
              </span>
              <input
                required
                value={form.airport}
                onChange={(event) =>
                  setForm({ ...form, airport: event.target.value })
                }
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>Flight number</span>
              <input
                value={form.flightNumber ?? ""}
                onChange={(event) =>
                  setForm({ ...form, flightNumber: event.target.value })
                }
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>
                Flight parent <span className="text-red-700">*</span>
              </span>
              <input
                required
                value={form.flightParent ?? ""}
                onChange={(event) =>
                  setForm({ ...form, flightParent: event.target.value })
                }
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2">
              <span>Comment</span>
              <textarea
                value={form.comment ?? ""}
                onChange={(event) =>
                  setForm({ ...form, comment: event.target.value })
                }
                className="min-h-24 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setIsEditing(false);
              }}
              className="rounded-xl border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isSaving}
              className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}

      <div
        className={`mt-6 grid gap-5 ${standaloneFlightId ? "grid-cols-1" : "lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]"}`}
      >
        {!standaloneFlightId && (
          <>
            <aside className="rounded-2xl border border-[#d4c7b4] bg-white/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {showDeleted ? "Deleted flights" : "Scheduled flights"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowDeleted((value) => !value)}
                  className="text-xs font-semibold text-[#a83f1a] underline underline-offset-2"
                >
                  {showDeleted ? "Show active" : "Show deleted"}
                </button>
              </div>
              {isLoading && (
                <p className="mt-4 text-sm text-[#6d6a66]" role="status">
                  Loading flights...
                </p>
              )}
              {!isLoading && visibleFlights.length === 0 && (
                <p className="mt-4 text-sm text-[#6d6a66]">
                  {showDeleted ? "No deleted flights." : "No flights yet."}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {visibleFlights.map((flight) => (
                  <li
                    key={flight.id}
                    className={`rounded-xl border p-3 ${selectedFlightId === flight.id ? "border-[#d05a2c] bg-[#f1d8c7]/40" : "border-[#d4c7b4] bg-white/70"}`}
                  >
                    <button
                      type="button"
                      onClick={() => void loadFlight(flight, showDeleted)}
                      className="w-full text-left"
                    >
                      <span className="block font-semibold text-gray-900">
                        {flight.flightNumber}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#6d6a66]">
                        {formatDateShort(flight.date)}
                        {" \u00B7 "}
                        {flight.airport}
                        {" \u00B7 "}
                        {flight.catCount} cats
                      </span>
                      <span className="mt-1 block truncate text-xs text-[#6d6a66]">
                        Flight parent: {flight.flightParent ?? "Not set"}
                      </span>
                    </button>
                    {showDeleted && (
                      <button
                        type="button"
                        disabled={flightActionId === flight.id}
                        onClick={() => void restoreFlight(flight.id)}
                        className="mt-2 rounded-lg border border-[#31734b] px-3 py-1 text-xs font-semibold text-[#31734b] disabled:opacity-50"
                      >
                        {flightActionId === flight.id
                          ? "Restoring..."
                          : "Restore flight"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={refreshLists}
                disabled={isLoading}
                className="mt-4 w-full rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Refresh flights
              </button>
            </aside>
          </>
        )}

        <div className="min-w-0 space-y-5">
          {isLoadingFlight && (
            <p
              className="rounded-xl border border-[#d4c7b4] bg-white/60 p-5 text-sm text-[#6d6a66]"
              role="status"
            >
              Loading flight...
            </p>
          )}
          {!standaloneFlightId && !isLoadingFlight && !selectedFlight && (
            <p className="rounded-xl border border-dashed border-[#d4c7b4] p-6 text-sm text-[#6d6a66]">
              Select a flight to manage its cats and audit history.
            </p>
          )}
          {!isLoadingFlight && selectedFlight && (
            <>
              <section className="rounded-2xl border border-[#d4c7b4] bg-white/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {formatDateShort(selectedFlight.date)}
                    </h2>
                    <p className="mt-1 text-sm text-[#6d6a66]">
                      {selectedFlight.flightNumber && (
                        <>
                          {selectedFlight.flightNumber}
                          {" \u00B7 "}
                        </>
                      )}
                      {selectedFlight.airport}
                      {" \u00B7 "}
                      {selectedFlight.cats.length} cats
                    </p>
                    <p className="mt-1 text-sm text-[#6d6a66]">
                      Flight parent: {selectedFlight.flightParent ?? "Not set"}
                    </p>
                    {selectedFlight.comment && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#6d6a66]">
                        {selectedFlight.comment}
                      </p>
                    )}
                  </div>
                  {!isDeletedSelection && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={startEdit}
                        aria-label="Edit flight"
                        title="Edit flight"
                        className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeFlight()}
                        disabled={flightActionId === selectedFlight.id}
                        aria-label="Archive flight"
                        title="Archive flight"
                        className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faBoxArchive} />
                      </button>
                    </div>
                  )}
                </div>
                {!isDeletedSelection && (
                  <MediaThumbnailGrid>
                    {sortedPhotos.map((photo) => (
                      <MediaThumbnail
                        key={photo.id}
                        menuOpen={thumbnailPhotoMenuId === photo.id}
                        onMenuOpenChange={(open) =>
                          setThumbnailPhotoMenuId(open ? photo.id : null)
                        }
                        menuLabel="Flight thumbnail actions"
                        preview={
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPhotoId(photo.id);
                              setIsPhotoMenuOpen(false);
                              setThumbnailPhotoMenuId(null);
                            }}
                            disabled={!photo.fullUrl && !photo.url}
                            className="block h-16 w-16 rounded-lg bg-[#eadfce] bg-cover bg-center transition brightness-95 hover:brightness-105 disabled:cursor-not-allowed"
                            style={
                              photo.url
                                ? { backgroundImage: `url(${photo.url})` }
                                : undefined
                            }
                            aria-label="Open flight photo"
                            title="Open flight photo"
                          />
                        }
                      >
                        <button
                          type="button"
                          onClick={() => void removePhoto(photo.id)}
                          disabled={photoActionId === photo.id}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {photoActionId === photo.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </MediaThumbnail>
                    ))}
                    <label
                      aria-label="Add photos"
                      title="Add photos"
                      className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#b24a20] bg-[#fff8ee] text-xl text-[#d05a2c] transition hover:bg-[#f1d8c7]/45 has-disabled:cursor-not-allowed has-disabled:opacity-60"
                    >
                      {isUploadingPhotos ? (
                        "…"
                      ) : (
                        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploadingPhotos}
                        onChange={(event) => {
                          void addPhotos(event.target.files);
                          event.target.value = "";
                        }}
                        className="sr-only"
                      />
                    </label>
                  </MediaThumbnailGrid>
                )}
                {isDeletedSelection && (
                  <p className="mt-3 text-sm text-red-800">
                    This flight is deleted. Its assignments cannot be managed
                    until it is restored.
                  </p>
                )}
              </section>

              {!isDeletedSelection && (
                <section className="overflow-hidden rounded-2xl border border-[#d4c7b4] bg-white/60">
                  <div className="flex flex-col gap-3 border-b border-[#d4c7b4] bg-[#f1d8c7]/45 p-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Assigned cats
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor="flight-cat-select">
                        Cat to assign
                      </label>
                      <select
                        id="flight-cat-select"
                        value={selectedCatId}
                        onChange={(event) =>
                          setSelectedCatId(event.target.value)
                        }
                        className="min-w-40 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Select a cat</option>
                        {availableCats.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          !selectedCatId || assignmentActionId === "new"
                        }
                        onClick={() => void assignCat()}
                        className="rounded-lg bg-[#d05a2c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                  {selectedFlight.cats.length === 0 ? (
                    <p className="p-5 text-sm text-[#6d6a66]">
                      No cats assigned to this flight.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-[#514a43]">
                          <tr>
                            <th scope="col" className="px-3 py-3">
                              Cat
                            </th>
                            <th scope="col" className="px-3 py-3 text-center">
                              F2F
                            </th>
                            <th scope="col" className="px-3 py-3 text-center">
                              Traces
                            </th>
                            <th scope="col" className="px-3 py-3 text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFlight.cats.map((assignment) => (
                            <tr
                              key={assignment.assignmentId}
                              className="border-t border-[#d4c7b4]/70"
                            >
                              <th
                                scope="row"
                                className="px-3 py-2 font-semibold"
                              >
                                <Link
                                  href={`/cats/${assignment.cat.id}`}
                                  className="text-[#a83f1a] underline-offset-2 hover:underline"
                                >
                                  {assignment.cat.name}
                                </Link>
                                {assignment.cat.archivedAt && (
                                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                    Archived
                                  </span>
                                )}
                              </th>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`F2F done for ${assignment.cat.name}`}
                                  checked={assignment.f2fDone}
                                  disabled={
                                    assignmentActionId ===
                                    assignment.assignmentId
                                  }
                                  onChange={(event) =>
                                    void updateAssignment(
                                      assignment.assignmentId,
                                      { f2fDone: event.target.checked },
                                    )
                                  }
                                  className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`Traces done for ${assignment.cat.name}`}
                                  checked={assignment.tracesDone}
                                  disabled={
                                    assignmentActionId ===
                                    assignment.assignmentId
                                  }
                                  onChange={(event) =>
                                    void updateAssignment(
                                      assignment.assignmentId,
                                      { tracesDone: event.target.checked },
                                    )
                                  }
                                  className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]"
                                />
                              </td>
                              <td className="px-3 py-px text-right">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void removeAssignment(
                                        assignment.assignmentId,
                                      )
                                    }
                                    disabled={
                                      assignmentActionId ===
                                      assignment.assignmentId
                                    }
                                    aria-label={`Remove ${assignment.cat.name} from flight`}
                                    title={`Remove ${assignment.cat.name} from flight`}
                                    className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {isDeletedSelection && (
                <section className="overflow-hidden rounded-2xl border border-[#d4c7b4] bg-white/60">
                  <div className="border-b border-[#d4c7b4] bg-[#f1d8c7]/45 p-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Assigned cats
                    </h2>
                    <p className="text-xs text-[#6d6a66]">
                      Read-only assignments for this deleted flight.
                    </p>
                  </div>
                  {deletedFlightCats.length === 0 ? (
                    <p className="p-5 text-sm text-[#6d6a66]">
                      No cats assigned to this flight.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-[#514a43]">
                          <tr>
                            <th scope="col" className="px-3 py-3">
                              Cat
                            </th>
                            <th scope="col" className="px-3 py-3 text-center">
                              F2F
                            </th>
                            <th scope="col" className="px-3 py-3 text-center">
                              Traces
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedFlightCats.map((assignment) => (
                            <tr
                              key={assignment.assignmentId}
                              className="border-t border-[#d4c7b4]/70"
                            >
                              <th
                                scope="row"
                                className="px-3 py-2 font-semibold"
                              >
                                <Link
                                  href={`/cats/${assignment.cat.id}`}
                                  className="text-[#a83f1a] underline-offset-2 hover:underline"
                                >
                                  {assignment.cat.name}
                                </Link>
                                {assignment.cat.archivedAt && (
                                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                    Archived
                                  </span>
                                )}
                              </th>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`F2F done for ${assignment.cat.name}`}
                                  checked={assignment.f2fDone}
                                  disabled
                                  readOnly
                                  className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`Traces done for ${assignment.cat.name}`}
                                  checked={assignment.tracesDone}
                                  disabled
                                  readOnly
                                  className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              <CatHistory
                mode="flight"
                title="Flight audit history"
                events={flightHistory}
                isLoading={isLoadingFlight}
                error={actionError}
                total={flightHistoryTotal}
                showCatName
              />
            </>
          )}
        </div>
      </div>
      {expandedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Flight photo preview"
        >
          <button
            type="button"
            onClick={() => {
              setExpandedPhotoId(null);
              setIsPhotoMenuOpen(false);
            }}
            className="absolute inset-0 z-0 cursor-zoom-out"
            aria-label="Close flight photo preview"
          />
          <div className="absolute left-4 top-4 z-30 rounded-full bg-black/35 px-3 py-1.5 text-sm font-semibold text-white">
            {expandedPhotoIndex + 1} / {sortedPhotos.length}
          </div>
          <div className="absolute right-4 top-4 z-30 flex items-start gap-2">
            <ContextMenu
              open={isPhotoMenuOpen}
              onOpenChange={setIsPhotoMenuOpen}
              menuLabel="Flight photo actions"
              className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-white/20 bg-[#fff8ee] p-2 shadow-2xl"
              trigger={
                <button
                  type="button"
                  onClick={() => setIsPhotoMenuOpen((isOpen) => !isOpen)}
                  aria-expanded={isPhotoMenuOpen}
                  aria-label="Flight photo actions"
                  title="Flight photo actions"
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Actions
                </button>
              }
            >
              <button
                type="button"
                onClick={() => void removePhoto(expandedPhoto.id)}
                disabled={photoActionId === expandedPhoto.id}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                {photoActionId === expandedPhoto.id ? "Deleting..." : "Delete"}
              </button>
            </ContextMenu>
            <button
              type="button"
              onClick={() => {
                setExpandedPhotoId(null);
                setIsPhotoMenuOpen(false);
              }}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Close
            </button>
          </div>
          {hasMultiplePhotos && (
            <button
              type="button"
              onClick={showPreviousPhoto}
              className="absolute left-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-3xl font-light text-white transition hover:bg-white/20"
              aria-label="Previous flight photo"
            >
              ‹
            </button>
          )}
          <div className="relative z-10 flex h-[88dvh] w-[95vw] items-center justify-center overflow-hidden rounded-2xl bg-black/30 shadow-2xl">
            <img
              src={expandedPhoto.fullUrl ?? expandedPhoto.url ?? undefined}
              alt="Flight"
              className="h-full w-full object-contain"
            />
          </div>
          {hasMultiplePhotos && (
            <button
              type="button"
              onClick={showNextPhoto}
              className="absolute right-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-3xl font-light text-white transition hover:bg-white/20"
              aria-label="Next flight photo"
            >
              ›
            </button>
          )}
        </div>
      )}
    </section>
  );
}
