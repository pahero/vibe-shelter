"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApiErrorHandler, formatDate, formatDateShort } from "@/lib/utils";
import {
  catsApi,
  CatCard,
  FlightAuditEvent,
  FlightDetails,
  FlightInput,
  FlightListItem,
  flightsApi,
} from "@/lib/api";

const auditLabels: Record<string, string> = {
  flight_created: "Flight created",
  flight_deleted: "Flight deleted",
  flight_restored: "Flight restored",
  flight_date_changed: "Flight date changed",
  flight_airport_changed: "Airport changed",
  flight_number_changed: "Flight number changed",
  flight_parent_changed: "Flight parent changed",
  flight_cat_assigned: "Cat assigned",
  flight_cat_unassigned: "Cat removed from flight",
  flight_cat_restored: "Cat assignment restored",
  flight_cat_f2f_changed: "Fit-to-fly status changed",
  flight_cat_traces_changed: "Traces status changed",
};

function emptyFlightForm(): FlightInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    airport: "",
    flightNumber: "",
    flightParent: "",
  };
}

export function FlightsClient() {
  const [flights, setFlights] = useState<FlightListItem[]>([]);
  const [deletedFlights, setDeletedFlights] = useState<FlightListItem[]>([]);
  const [cats, setCats] = useState<CatCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightDetails | null>(null);
  const [flightHistory, setFlightHistory] = useState<FlightAuditEvent[]>([]);
  const [isLoadingFlight, setIsLoadingFlight] = useState(false);
  const [isDeletedSelection, setIsDeletedSelection] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FlightInput>(emptyFlightForm);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [assignmentActionId, setAssignmentActionId] = useState<string | null>(null);
  const [flightActionId, setFlightActionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([flightsApi.list(), flightsApi.list(true), catsApi.listCats({ limit: 100 })])
      .then(([active, deleted, catResponse]) => {
        if (cancelled) return;
        setFlights(active);
        setDeletedFlights(deleted);
        setCats(catResponse.data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setLoadingError(ApiErrorHandler.handle(reason));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

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
          updatedAt: "",
          cats: [],
        });
        setFlightHistory(await flightsApi.history(flight.id));
      } else {
        const [detail, history] = await Promise.all([flightsApi.get(flight.id), flightsApi.history(flight.id)]);
        setSelectedFlight(detail);
        setFlightHistory(history);
      }
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setIsLoadingFlight(false);
    }
  };

  const refreshSelectedFlight = async () => {
    if (!selectedFlightId) return;
    const flightListItem = [...flights, ...deletedFlights].find((flight) => flight.id === selectedFlightId);
    if (flightListItem) await loadFlight(flightListItem, isDeletedSelection);
    refreshLists();
  };

  const startCreate = () => {
    setSelectedFlightId(null);
    setSelectedFlight(null);
    setFlightHistory([]);
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
    });
    setIsEditing(true);
    setIsFormOpen(true);
    setActionError(null);
  };

  const saveFlight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.date || !form.airport.trim() || !form.flightNumber.trim() || !form.flightParent.trim()) {
      setActionError("Enter the date, airport, flight number, and flight parent.");
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      const payload = {
        ...form,
        airport: form.airport.trim(),
        flightNumber: form.flightNumber.trim(),
        flightParent: form.flightParent.trim(),
      };
      if (isEditing && selectedFlightId) {
        await flightsApi.update(selectedFlightId, payload);
        const current = [...flights, ...deletedFlights].find((item) => item.id === selectedFlightId);
        if (current) await loadFlight({ ...current, ...payload }, false);
      } else {
        const result = await flightsApi.create(payload);
        const createdFlight: FlightListItem = { id: result.id, ...payload, deletedAt: null, catCount: 0 };
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
      setSelectedFlightId(null);
      setSelectedFlight(null);
      setFlightHistory([]);
      refreshLists();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setFlightActionId(null);
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
      }
      refreshLists();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setFlightActionId(null);
    }
  };

  const restoreAssignment = async (assignmentId: string) => {
    setAssignmentActionId(assignmentId);
    setActionError(null);
    try {
      await flightsApi.restoreAssignment(assignmentId);
      await refreshSelectedFlight();
    } catch (reason) {
      setActionError(ApiErrorHandler.handle(reason));
    } finally {
      setAssignmentActionId(null);
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

  const updateAssignment = async (assignmentId: string, values: { f2fDone?: boolean; tracesDone?: boolean }) => {
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
  const assignedCatIds = new Set(selectedFlight?.cats.map(({ cat }) => cat.id) ?? []);
  const availableCats = cats.filter((cat) => !cat.archivedAt && !assignedCatIds.has(cat.id));
  const restoredAssignmentEventIds = new Set<string>();
  const assignmentRestoreEventIds = new Set<string>();
  for (const event of flightHistory) {
    if (event.eventType === "flight_cat_unassigned" && event.assignment?.isDeleted && !restoredAssignmentEventIds.has(event.assignment.id)) {
      restoredAssignmentEventIds.add(event.assignment.id);
      assignmentRestoreEventIds.add(event.id);
    }
  }

  return (
    <section className="w-full max-w-6xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Travel planning</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-900">Flights</h1>
          <p className="mt-2 text-sm text-[#6d6a66]">Manage flight details, assigned cats, fit-to-fly checks, traces, and audit history.</p>
        </div>
        <button type="button" onClick={startCreate} className="rounded-xl bg-[#d05a2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b24a20]">
          Add flight
        </button>
      </div>

      {loadingError && <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{loadingError}</p>}
      {actionError && <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{actionError}</p>}

      {isFormOpen && (
        <form onSubmit={saveFlight} className="mt-5 rounded-2xl border border-[#d4c7b4] bg-white/60 p-4">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{isEditing ? "Edit flight" : "Add flight"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>Date <span className="text-red-700">*</span></span>
              <input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>Airport <span className="text-red-700">*</span></span>
              <input required value={form.airport} onChange={(event) => setForm({ ...form, airport: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>Flight number <span className="text-red-700">*</span></span>
              <input required value={form.flightNumber} onChange={(event) => setForm({ ...form, flightNumber: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              <span>Flight parent <span className="text-red-700">*</span></span>
              <input required value={form.flightParent} onChange={(event) => setForm({ ...form, flightParent: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => { setIsFormOpen(false); setIsEditing(false); }} className="rounded-xl border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={isSaving} className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save flight"}</button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#d4c7b4] bg-white/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{showDeleted ? "Deleted flights" : "Scheduled flights"}</h2>
            <button type="button" onClick={() => setShowDeleted((value) => !value)} className="text-xs font-semibold text-[#a83f1a] underline underline-offset-2">
              {showDeleted ? "Show active" : "Show deleted"}
            </button>
          </div>
          {isLoading && <p className="mt-4 text-sm text-[#6d6a66]" role="status">Loading flights...</p>}
          {!isLoading && visibleFlights.length === 0 && <p className="mt-4 text-sm text-[#6d6a66]">{showDeleted ? "No deleted flights." : "No flights yet."}</p>}
          <ul className="mt-3 space-y-2">
            {visibleFlights.map((flight) => (
              <li key={flight.id} className={`rounded-xl border p-3 ${selectedFlightId === flight.id ? "border-[#d05a2c] bg-[#f1d8c7]/40" : "border-[#d4c7b4] bg-white/70"}`}>
                <button type="button" onClick={() => void loadFlight(flight, showDeleted)} className="w-full text-left">
                  <span className="block font-semibold text-gray-900">{flight.flightNumber}</span>
                  <span className="mt-0.5 block text-xs text-[#6d6a66]">{formatDateShort(flight.date)} · {flight.airport} · {flight.catCount} cats</span>
                  <span className="mt-1 block truncate text-xs text-[#6d6a66]">Flight parent: {flight.flightParent}</span>
                </button>
                {showDeleted && <button type="button" disabled={flightActionId === flight.id} onClick={() => void restoreFlight(flight.id)} className="mt-2 rounded-lg border border-[#31734b] px-3 py-1 text-xs font-semibold text-[#31734b] disabled:opacity-50">{flightActionId === flight.id ? "Restoring..." : "Restore flight"}</button>}
              </li>
            ))}
          </ul>
          <button type="button" onClick={refreshLists} disabled={isLoading} className="mt-4 w-full rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">Refresh flights</button>
        </aside>

        <div className="min-w-0 space-y-5">
          {isLoadingFlight && <p className="rounded-xl border border-[#d4c7b4] bg-white/60 p-5 text-sm text-[#6d6a66]" role="status">Loading flight...</p>}
          {!isLoadingFlight && !selectedFlight && <p className="rounded-xl border border-dashed border-[#d4c7b4] p-6 text-sm text-[#6d6a66]">Select a flight to manage its cats and audit history.</p>}
          {!isLoadingFlight && selectedFlight && (
            <>
              <section className="rounded-2xl border border-[#d4c7b4] bg-white/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#d05a2c]">{isDeletedSelection ? "Deleted flight" : "Flight details"}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-gray-900">{selectedFlight.flightNumber}</h2>
                    <p className="mt-1 text-sm text-[#6d6a66]">{formatDateShort(selectedFlight.date)} · {selectedFlight.airport}</p>
                    <p className="mt-1 text-sm text-[#6d6a66]">Flight parent: {selectedFlight.flightParent}</p>
                  </div>
                  {!isDeletedSelection && (
                    <div className="flex gap-1">
                      <button type="button" onClick={startEdit} aria-label="Edit flight" title="Edit flight" className="rounded-md p-2 text-gray-700 hover:bg-gray-100"><FontAwesomeIcon icon={faPen} /></button>
                      <button type="button" onClick={() => void removeFlight()} disabled={flightActionId === selectedFlight.id} aria-label="Delete flight" title="Delete flight" className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                  )}
                </div>
                {isDeletedSelection && <p className="mt-3 text-sm text-red-800">This flight is deleted. Restore it from the list to resume managing assignments.</p>}
              </section>

              {!isDeletedSelection && (
                <section className="overflow-hidden rounded-2xl border border-[#d4c7b4] bg-white/60">
                  <div className="flex flex-col gap-3 border-b border-[#d4c7b4] bg-[#f1d8c7]/45 p-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Assigned cats</h2>
                      <p className="text-xs text-[#6d6a66]">Record each cat’s fit-to-fly (F2F) and traces status.</p>
                    </div>
                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor="flight-cat-select">Cat to assign</label>
                      <select id="flight-cat-select" value={selectedCatId} onChange={(event) => setSelectedCatId(event.target.value)} className="min-w-40 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm">
                        <option value="">Select a cat</option>
                        {availableCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                      <button type="button" disabled={!selectedCatId || assignmentActionId === "new"} onClick={() => void assignCat()} className="rounded-lg bg-[#d05a2c] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Assign</button>
                    </div>
                  </div>
                  {selectedFlight.cats.length === 0 ? (
                    <p className="p-5 text-sm text-[#6d6a66]">No cats assigned to this flight.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[660px] w-full border-collapse text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-[#514a43]">
                          <tr>
                            <th scope="col" className="px-3 py-3">Cat</th>
                            <th scope="col" className="px-3 py-3 text-center">F2F</th>
                            <th scope="col" className="px-3 py-3 text-center">Traces</th>
                            <th scope="col" className="px-3 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFlight.cats.map((assignment) => (
                            <tr key={assignment.assignmentId} className="border-t border-[#d4c7b4]/70">
                              <th scope="row" className="px-3 py-2 font-semibold">
                                <Link href={`/cats/${assignment.cat.id}`} className="text-[#a83f1a] underline-offset-2 hover:underline">{assignment.cat.name}</Link>
                                {assignment.cat.archivedAt && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Archived</span>}
                              </th>
                              <td className="px-3 py-2 text-center">
                                <input type="checkbox" aria-label={`F2F done for ${assignment.cat.name}`} checked={assignment.f2fDone} disabled={assignmentActionId === assignment.assignmentId} onChange={(event) => void updateAssignment(assignment.assignmentId, { f2fDone: event.target.checked })} className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]" />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input type="checkbox" aria-label={`Traces done for ${assignment.cat.name}`} checked={assignment.tracesDone} disabled={assignmentActionId === assignment.assignmentId} onChange={(event) => void updateAssignment(assignment.assignmentId, { tracesDone: event.target.checked })} className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]" />
                              </td>
                              <td className="px-3 py-px text-right">
                                <div className="flex justify-end">
                                  <button type="button" onClick={() => void removeAssignment(assignment.assignmentId)} disabled={assignmentActionId === assignment.assignmentId} aria-label={`Remove ${assignment.cat.name} from flight`} title={`Remove ${assignment.cat.name} from flight`} className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"><FontAwesomeIcon icon={faTrash} /></button>
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

              <section className="rounded-2xl border border-[#d4c7b4] bg-white/60 p-5">
                <h2 className="text-lg font-semibold text-gray-900">Flight audit history</h2>
                {flightHistory.length === 0 ? <p className="mt-3 text-sm text-[#6d6a66]">No history yet.</p> : (
                  <ol className="mt-3 divide-y divide-[#d4c7b4] border-y border-[#d4c7b4]">
                    {flightHistory.map((event) => (
                      <li key={event.id} className={`px-3 py-2 ${event.eventType.endsWith("_created") || event.eventType.endsWith("_restored") ? "border-l-4 border-l-[#31734b] bg-[#31734b]/10" : event.eventType.endsWith("_deleted") || event.eventType.endsWith("_unassigned") ? "border-l-4 border-l-red-700 bg-red-50/70" : "border-l-4 border-l-amber-600 bg-amber-50/70"}`}>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {auditLabels[event.eventType] ?? event.eventType}{event.cat ? ` · ${event.cat.name}` : ""}
                            <span className="font-normal text-[#6d6a66]"> by {event.actor.displayName}</span>
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            <time className="text-xs text-[#6d6a66]" dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                            {event.assignment?.isDeleted && assignmentRestoreEventIds.has(event.id) && <button type="button" disabled={assignmentActionId === event.assignment.id} onClick={() => void restoreAssignment(event.assignment!.id)} className="rounded-lg border border-[#31734b] px-2 py-1 text-xs font-semibold text-[#31734b] hover:bg-[#31734b]/10 disabled:opacity-50">{assignmentActionId === event.assignment.id ? "Restoring..." : "Restore cat"}</button>}
                          </div>
                        </div>
                        {(event.oldValue !== null || event.newValue !== null) && <p className="mt-1 text-xs text-[#6d6a66]">{event.oldValue ?? "Not set"} -&gt; {event.newValue ?? "Not set"}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
