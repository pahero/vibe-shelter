"use client";

import { type FormEvent, useEffect, useState } from "react";
import { CatCard } from "@/components/cat-card";
import { CatColorDatalist } from "@/components/cat-color-options";
import { ApiErrorHandler } from "@/lib/utils";
import { CatCard as CatCardType, CatSex, CatTag, CreateCatDto, Location, SterilizationStatus, catsApi, locationsApi } from "@/lib/api";

const CATS_PER_PAGE = 6;

function emptyCatForm(locationId = "") {
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

export function HomeCatsList() {
  const [cats, setCats] = useState<CatCardType[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<CatTag[]>([]);
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(() => emptyCatForm());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocations() {
      setIsLoadingLocations(true);
      setLocationError(null);

      try {
        const response = await locationsApi.listLocations({ status: "ACTIVE", limit: 100 });

        if (!cancelled) {
          setLocations(response.data);
          setCreateForm((prev) => ({
            ...prev,
            currentLocationId: response.data.some((location) => location.id === prev.currentLocationId) ? prev.currentLocationId : response.data[0]?.id ?? "",
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setLocationError(ApiErrorHandler.handle(err));
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
    let cancelled = false;

    async function fetchTags() {
      setTagError(null);
      try {
        const data = await catsApi.listTags();
        if (!cancelled) {
          setTags(data);
        }
      } catch (err) {
        if (!cancelled) {
          setTagError(ApiErrorHandler.handle(err));
          setTags([]);
        }
      }
    }

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchCats() {
      setIsLoading(true);
      setError(null);
      setNeedsSignIn(false);

      try {
        const response = await catsApi.listCats({
          locationId: locationFilter || undefined,
          status: "ACTIVE",
          search: search.trim() || undefined,
          tagId: tagFilter || undefined,
          skip: (currentPage - 1) * CATS_PER_PAGE,
          limit: CATS_PER_PAGE,
        });

        if (!cancelled) {
          setCats(response.data);
          setTotal(response.total);
        }
      } catch (err) {
        if (!cancelled) {
          const statusCode = err && typeof err === "object" && "statusCode" in err ? (err.statusCode as number) : null;
          if (statusCode === 401 || statusCode === 403) {
            setNeedsSignIn(true);
          } else {
            setError(ApiErrorHandler.handle(err));
          }
          setCats([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCats();

    return () => {
      cancelled = true;
    };
  }, [currentPage, locationFilter, refreshKey, search, tagFilter]);

  const handleCreateCat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCreateSuccess(null);

    const name = createForm.name.trim();
    if (!name) {
      setError("Cat name is required.");
      return;
    }
    if (!locations.some((location) => location.id === createForm.currentLocationId)) {
      setError("Choose an active location for this cat.");
      return;
    }

    const payload: CreateCatDto = {
      name,
      sex: createForm.sex,
      color: createForm.color.trim() || null,
      estimatedBirthDate: createForm.estimatedBirthDate || null,
      intakeDate: createForm.intakeDate || null,
      rescueSource: createForm.rescueSource.trim() || null,
      microchipNumber: createForm.microchipNumber.trim() || null,
      passportNumber: createForm.passportNumber.trim() || null,
      sterilizationStatus: createForm.sterilizationStatus,
      currentLocationId: createForm.currentLocationId || null,
    };

    setIsCreating(true);
    try {
      const created = await catsApi.createCat(payload);
      setCreateForm(emptyCatForm(locations[0]?.id ?? ""));
      setShowCreateForm(false);
      setCreateSuccess(`${created.name} was added.`);
      setCurrentPage(1);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsCreating(false);
    }
  };

  const totalPages = Math.ceil(total / CATS_PER_PAGE);
  const locationFilterLabel = locations.find((location) => location.id === locationFilter)?.name ?? "All locations";

  return (
    <section className="w-full max-w-6xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 px-6 pb-6 pt-3 shadow-panel backdrop-blur-sm [animation-delay:160ms] md:px-8 md:pb-8 md:pt-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Cats list</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((isOpen) => !isOpen);
            setCreateSuccess(null);
            setError(null);
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
        >
          {showCreateForm ? "Close form" : "+ Add Cat"}
        </button>
      </div>

      {createSuccess && <p className="mt-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800">{createSuccess}</p>}

      {showCreateForm && (
        <form onSubmit={handleCreateCat} className="mt-5 rounded-2xl border border-[#d4c7b4] bg-white/60 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Name *
              <input value={createForm.name} onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="Mila" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Color
              <input value={createForm.color} onChange={(event) => setCreateForm((prev) => ({ ...prev, color: event.target.value }))} list="cat-color-options" className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="Black-white" />
              <CatColorDatalist />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Sex *
              <select value={createForm.sex} onChange={(event) => setCreateForm((prev) => ({ ...prev, sex: event.target.value as CatSex }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]">
                <option value="UNKNOWN">Unknown</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Neutering *
              <select value={createForm.sterilizationStatus} onChange={(event) => setCreateForm((prev) => ({ ...prev, sterilizationStatus: event.target.value as SterilizationStatus }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]">
                <option value="UNKNOWN">Unknown</option>
                <option value="STERILIZED">Neutered</option>
                <option value="NOT_STERILIZED">Not neutered</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2">
              Location
              <select value={createForm.currentLocationId} onChange={(event) => setCreateForm((prev) => ({ ...prev, currentLocationId: event.target.value }))} disabled={isLoadingLocations || locations.length === 0} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c] disabled:cursor-not-allowed disabled:opacity-60">
                {locations.length === 0 && <option value="">No active locations</option>}
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Intake date
              <input type="date" value={createForm.intakeDate} onChange={(event) => setCreateForm((prev) => ({ ...prev, intakeDate: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Estimated birth date
              <input type="date" value={createForm.estimatedBirthDate} onChange={(event) => setCreateForm((prev) => ({ ...prev, estimatedBirthDate: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Microchip number
              <input value={createForm.microchipNumber} onChange={(event) => setCreateForm((prev) => ({ ...prev, microchipNumber: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Passport number
              <input value={createForm.passportNumber} onChange={(event) => setCreateForm((prev) => ({ ...prev, passportNumber: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2">
              Rescue source
              <input value={createForm.rescueSource} onChange={(event) => setCreateForm((prev) => ({ ...prev, rescueSource: event.target.value }))} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]" placeholder="Found near clinic" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-xl border border-[#d4c7b4] bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Cancel</button>
            <button disabled={isCreating || isLoadingLocations || locations.length === 0} className="rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50">
              {isCreating ? "Adding..." : "Add cat"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_minmax(180px,260px)] md:items-end">
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

        <div className="relative grid gap-1 text-sm font-medium text-gray-800">
          <span id="home-location-filter-label">Location</span>
          <button
            type="button"
            aria-labelledby="home-location-filter-label"
            aria-haspopup="listbox"
            aria-expanded={isLocationFilterOpen}
            disabled={isLoadingLocations || locations.length === 0}
            onClick={() => setIsLocationFilterOpen((isOpen) => !isOpen)}
            onBlur={(event) => {
              if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
                setIsLocationFilterOpen(false);
              }
            }}
            className="flex w-full items-center justify-between rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isLoadingLocations ? "Loading locations..." : locationFilterLabel}</span>
            <span className="text-[#6d6a66]">⌄</span>
          </button>
          {isLocationFilterOpen && (
            <div
              role="listbox"
              aria-labelledby="home-location-filter-label"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-[#d4c7b4] bg-white py-1 text-sm shadow-lg"
            >
              <button
                type="button"
                role="option"
                aria-selected={locationFilter === ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setLocationFilter("");
                  setCurrentPage(1);
                  setIsLocationFilterOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left transition hover:bg-[#fff0e8] ${
                  locationFilter === "" ? "bg-[#d05a2c] text-white hover:bg-[#d05a2c]" : "text-gray-900"
                }`}
              >
                All locations
              </button>
              {locations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  role="option"
                  aria-selected={locationFilter === location.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setLocationFilter(location.id);
                    setCurrentPage(1);
                    setIsLocationFilterOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left transition hover:bg-[#fff0e8] ${
                    locationFilter === location.id ? "bg-[#d05a2c] text-white hover:bg-[#d05a2c]" : "text-gray-900"
                  }`}
                >
                  {location.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="grid gap-1 text-sm font-medium text-gray-800">
          Tag
          <select
            value={tagFilter}
            onChange={(event) => {
              setTagFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>

      </div>

      {locationError && <p className="mt-2 text-sm text-red-700">Locations could not be loaded: {locationError}</p>}
      {tagError && <p className="mt-2 text-sm text-red-700">Tags could not be loaded: {tagError}</p>}

      {isLoading && <p className="py-10 text-center text-sm text-[#6d6a66]">Loading cat cards...</p>}

      {!isLoading && needsSignIn && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-8 text-center">
          <p className="text-sm font-medium text-gray-900">Sign in to view the cats list.</p>
          <p className="mt-1 text-sm text-[#6d6a66]">Cat records are protected for shelter staff.</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {!isLoading && !needsSignIn && !error && cats.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-8 text-center">
          <p className="text-sm text-[#6d6a66]">No cats found.</p>
        </div>
      )}

      {!isLoading && cats.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cats.map((cat) => (
            <CatCard key={cat.id} cat={cat} showTags={false} />
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
