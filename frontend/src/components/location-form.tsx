"use client";

import { useState } from "react";
import { CreateLocationDto, UpdateLocationDto, Location } from "@/lib/api";

export type LocationFormProps = {
  initialData?: Location;
  onSubmit: (data: CreateLocationDto | UpdateLocationDto) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
};

export function LocationForm({ initialData, onSubmit, isLoading = false, error }: LocationFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? "",
    type: (initialData?.type ?? "SHELTER") as "SHELTER" | "CLINIC" | "FOSTER",
    description: initialData?.description ?? "",
    ownerId: initialData?.ownerId ?? "",
    status: (initialData?.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE" | "ARCHIVED",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Location name is required";
    } else if (formData.name.length < 2) {
      errors.name = "Location name must be at least 2 characters";
    } else if (formData.name.length > 255) {
      errors.name = "Location name must be at most 255 characters";
    }

    if (!formData.type) {
      errors.type = "Location type is required";
    }

    if (formData.ownerId && formData.ownerId.length < 1) {
      errors.ownerId = "Invalid owner ID";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = initialData
        ? {
            name: formData.name,
            description: formData.description || null,
            ownerId: formData.ownerId || null,
            status: formData.status,
          }
      : {
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          ownerId: formData.ownerId || undefined,
        };

    try {
      await onSubmit(submitData);
    } catch (err) {
      // Error is handled by parent component
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Location Name */}
      <div>
        <label htmlFor="name" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
          Location Name *
        </label>
        <input
          id="name"
          type="text"
          placeholder="e.g., Downtown Shelter"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={`mt-2 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
            validationErrors.name
              ? "border-red-300 bg-red-50 focus:ring-red-500"
              : "border-[#d4c7b4] bg-white focus:ring-[#d05a2c]"
          }`}
        />
        {validationErrors.name && <p className="mt-1 text-xs text-red-600">{validationErrors.name}</p>}
      </div>

      {/* Location Type */}
      <div>
        <label htmlFor="type" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
          Location Type {!initialData && "*"}
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => handleChange("type", e.target.value)}
          disabled={!!initialData}
          className={`mt-2 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
            validationErrors.type
              ? "border-red-300 bg-red-50 focus:ring-red-500"
              : "border-[#d4c7b4] bg-white focus:ring-[#d05a2c]"
          } ${initialData ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <option value="SHELTER">Shelter</option>
          <option value="CLINIC">Clinic</option>
          <option value="FOSTER">Foster</option>
        </select>
        {initialData && <p className="mt-1 text-xs text-[#6d6a66]">Cannot change type after creation</p>}
        {validationErrors.type && <p className="mt-1 text-xs text-red-600">{validationErrors.type}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
          Description
        </label>
        <textarea
          id="description"
          placeholder="Enter location description (optional)"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
        />
      </div>

      {/* Owner ID (Foster-specific) */}
      <div>
        <label htmlFor="ownerId" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
          Owner ID {formData.type === "FOSTER" && "*"}
        </label>
        <input
          id="ownerId"
          type="text"
          placeholder={formData.type === "FOSTER" ? "Enter foster owner ID (required for foster)" : "Optional owner ID"}
          value={formData.ownerId}
          onChange={(e) => handleChange("ownerId", e.target.value)}
          className={`mt-2 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
            validationErrors.ownerId
              ? "border-red-300 bg-red-50 focus:ring-red-500"
              : "border-[#d4c7b4] bg-white focus:ring-[#d05a2c]"
          }`}
        />
        {validationErrors.ownerId && <p className="mt-1 text-xs text-red-600">{validationErrors.ownerId}</p>}
      </div>

      {/* Status (Edit only) */}
      {initialData && (
        <div>
          <label htmlFor="status" className="block font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Saving..." : initialData ? "Update Location" : "Create Location"}
      </button>
    </form>
  );
}
