"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { locationsApi, Location, ListLocationsParams } from "@/lib/api";
import { LocationItem } from "@/components/location-item";
import { ApiErrorHandler } from "@/lib/utils";

const LOCATIONS_PER_PAGE = 10;

export function LocationsList() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ownerIdFilter, setOwnerIdFilter] = useState<string>("");

  useEffect(() => {
    fetchLocations();
  }, [currentPage, typeFilter, statusFilter, ownerIdFilter]);

  const fetchLocations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: ListLocationsParams = {
        skip: (currentPage - 1) * LOCATIONS_PER_PAGE,
        limit: LOCATIONS_PER_PAGE,
      };

      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (ownerIdFilter) params.ownerId = ownerIdFilter;

      const response = await locationsApi.listLocations(params);
      setLocations(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    setArchivingId(id);
    try {
      await locationsApi.archiveLocation(id);
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setArchivingId(null);
    }
  };

  const totalPages = Math.ceil(total / LOCATIONS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Locations</h1>
          <p className="mt-1 text-sm text-gray-600">Manage shelters, clinics, and foster locations</p>
        </div>
        <Link
          href="/locations/new"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
        >
          + New Location
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-[#d4c7b4] bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="type-filter" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
              Type Filter
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
            >
              <option value="">All Types</option>
              <option value="SHELTER">Shelter</option>
              <option value="CLINIC">Clinic</option>
              <option value="FOSTER">Foster</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
              Status Filter
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label htmlFor="owner-id-filter" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
              Owner ID Filter
            </label>
            <input
              id="owner-id-filter"
              type="text"
              value={ownerIdFilter}
              onChange={(e) => {
                setOwnerIdFilter(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by owner ID"
              className="mt-2 w-full rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-gray-600">Loading locations...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && locations.length === 0 && (
        <div className="rounded-lg border border-[#d4c7b4] bg-[#fff8ee]/50 p-8 text-center">
          <p className="text-sm text-gray-600">No locations found. Create one to get started!</p>
        </div>
      )}

      {/* Locations Grid */}
      {!isLoading && locations.length > 0 && (
        <div className="grid gap-4">
          {locations.map((location) => (
            <LocationItem
              key={location.id}
              location={location}
              onArchive={handleArchive}
              isArchiving={archivingId === location.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-[#d4c7b4] bg-white p-4">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({total} total)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!hasPrevPage}
              className="rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={!hasNextPage}
              className="rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
