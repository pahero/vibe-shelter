"use client";

import { FormEvent, useEffect, useState } from "react";
import { CatCard } from "@/components/cat-card";
import { CatColorDatalist } from "@/components/cat-color-options";
import { ApiErrorHandler } from "@/lib/utils";
import { CatCard as CatCardType, CatSex, CreateCatDto, Location, catsApi, locationsApi, SterilizationStatus } from "@/lib/api";

type LocationCatsSectionProps = {
  locationId: string;
  locationName: string;
};

const CATS_PER_PAGE = 6;

function emptyForm(locationId: string) {
  return {
    name: "",
    sex: "UNKNOWN" as CatSex,
    color: "",
    estimatedBirthDate: "",
    intakeDate: "",
    microchipNumber: "",
    passportNumber: "",
    rescueSource: "",
    sterilizationStatus: "UNKNOWN" as SterilizationStatus,
    currentLocationId: locationId,
  };
}

export function LocationCatsSection({ locationId, locationName }: LocationCatsSectionProps) {
  const [cats, setCats] = useState<CatCardType[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [form, setForm] = useState(() => emptyForm(locationId));

  useEffect(() => {
    setForm((prev) => ({ ...prev, currentLocationId: locationId }));
  }, [locationId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocations() {
      setIsLoadingLocations(true);
      try {
        const response = await locationsApi.listLocations({ status: "ACTIVE", limit: 100 });
        if (!cancelled) {
          setLocations(response.data);
          setForm((prev) => ({
            ...prev,
            currentLocationId: response.data.some((location) => location.id === prev.currentLocationId)
              ? prev.currentLocationId
              : response.data[0]?.id ?? "",
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(ApiErrorHandler.handle(err));
          setLocations([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLocations(false);
        }
      }
    }

    fetchLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchCats();
  }, [locationId, currentPage, search]);

  const fetchCats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await catsApi.listCats({
        locationId,
        search: search.trim() || undefined,
        skip: (currentPage - 1) * CATS_PER_PAGE,
        limit: CATS_PER_PAGE,
      });
      setCats(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const name = form.name.trim();
    if (!name) {
      setError("Cat name is required.");
      return;
    }
    if (!locations.some((location) => location.id === form.currentLocationId)) {
      setError("Choose an active location for this cat.");
      return;
    }

    const payload: CreateCatDto = {
      name,
      sex: form.sex,
      color: form.color.trim() || null,
      estimatedBirthDate: form.estimatedBirthDate || null,
      intakeDate: form.intakeDate || null,
      rescueSource: form.rescueSource.trim() || null,
      microchipNumber: form.microchipNumber.trim() || null,
      passportNumber: form.passportNumber.trim() || null,
      sterilizationStatus: form.sterilizationStatus,
      currentLocationId: form.currentLocationId || null,
    };

    setIsCreating(true);
    try {
      const created = await catsApi.createCat(payload);
      if (created.currentLocationId === locationId) {
        setCats((prev) => [created, ...prev].slice(0, CATS_PER_PAGE));
        setTotal((prev) => prev + 1);
      }
      setForm(emptyForm(locationId));
      setShowForm(false);
      setSuccess(`${created.name} was added to ${created.currentLocationName || "the selected location"}.`);
      setCurrentPage(1);
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsCreating(false);
    }
  };

  const totalPages = Math.ceil(total / CATS_PER_PAGE);

  return (
    <section className="mt-8 rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Cats at this location</p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-900">Cat cards</h2>
          <p className="mt-1 text-sm text-[#6d6a66]">Active cats assigned to {locationName}.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
        >
          {showForm ? "Close form" : "+ Add Cat"}
        </button>
      </div>

      {(error || success) && (
        <div className={`mt-5 rounded-lg border p-4 ${error ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
          <p className={`text-sm font-medium ${error ? "text-red-800" : "text-green-800"}`}>{error || success}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-5 rounded-2xl border border-[#d4c7b4] bg-white/60 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Name *
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                placeholder="Mila"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Color
              <input
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                list="cat-color-options"
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                placeholder="Black-white"
              />
              <CatColorDatalist />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Sex *
              <select
                value={form.sex}
                onChange={(event) => setForm((prev) => ({ ...prev, sex: event.target.value as CatSex }))}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Neutering *
              <select
                value={form.sterilizationStatus}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sterilizationStatus: event.target.value as SterilizationStatus }))
                }
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="STERILIZED">Neutered</option>
                <option value="NOT_STERILIZED">Not neutered</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2">
              Location
              <select
                value={form.currentLocationId}
                onChange={(event) => setForm((prev) => ({ ...prev, currentLocationId: event.target.value }))}
                disabled={isLoadingLocations || locations.length === 0}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locations.length === 0 && <option value="">No active locations</option>}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Intake date
              <input
                type="date"
                value={form.intakeDate}
                onChange={(event) => setForm((prev) => ({ ...prev, intakeDate: event.target.value }))}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Estimated birth date
              <input
                type="date"
                value={form.estimatedBirthDate}
                onChange={(event) => setForm((prev) => ({ ...prev, estimatedBirthDate: event.target.value }))}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Microchip number
              <input
                value={form.microchipNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, microchipNumber: event.target.value }))}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Passport number
              <input
                value={form.passportNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, passportNumber: event.target.value }))}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2">
              Rescue source
              <input
                value={form.rescueSource}
                onChange={(event) => setForm((prev) => ({ ...prev, rescueSource: event.target.value }))}
                className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                placeholder="Found near clinic"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-[#d4c7b4] bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={isCreating || isLoadingLocations || locations.length === 0}
              className="rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Adding..." : "Add cat"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid max-w-md flex-1 gap-1 text-sm font-medium text-gray-800">
          Search cats
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Name, microchip, or passport"
            className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
          />
        </label>
        <p className="text-sm text-[#6d6a66]">{total} active cat{total === 1 ? "" : "s"}</p>
      </div>

      {isLoading && <p className="py-10 text-center text-sm text-[#6d6a66]">Loading cat cards...</p>}

      {!isLoading && cats.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/40 p-8 text-center">
          <p className="text-sm text-[#6d6a66]">No active cats found for this location.</p>
        </div>
      )}

      {!isLoading && cats.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cats.map((cat) => (
            <CatCard key={cat.id} cat={cat} />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between rounded-lg border border-[#d4c7b4] bg-white/60 p-4">
          <span className="text-sm text-[#6d6a66]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
