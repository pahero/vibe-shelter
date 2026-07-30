"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CatCard } from "@/components/cat-card";
import { CatCard as CatCardType, CatSex, CatStatus, SterilizationStatus, catsApi } from "@/lib/api";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

type CatEditForm = {
  name: string;
  sex: CatSex;
  color: string;
  estimatedBirthDate: string;
  intakeDate: string;
  microchipNumber: string;
  sterilizationStatus: SterilizationStatus;
  status: CatStatus;
};

function dateInputValue(date: string | null): string {
  return date ? date.slice(0, 10) : "";
}

function catToEditForm(cat: CatCardType): CatEditForm {
  return {
    name: cat.name,
    sex: cat.sex,
    color: cat.color ?? "",
    estimatedBirthDate: dateInputValue(cat.estimatedBirthDate),
    intakeDate: dateInputValue(cat.intakeDate),
    microchipNumber: cat.microchipNumber ?? "",
    sterilizationStatus: cat.sterilizationStatus,
    status: cat.status,
  };
}

export default function CatProfilePage() {
  const params = useParams();
  const catId = params?.id as string;
  const [cat, setCat] = useState<CatCardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CatEditForm | null>(null);

  useEffect(() => {
    if (!catId) return;

    const fetchCat = async () => {
      setIsLoading(true);
      setError(null);
      try {
        setCat(await catsApi.getCatCard(catId));
      } catch (err) {
        if (ApiErrorHandler.isNotFoundError(err)) {
          setError("Cat not found");
        } else {
          setError(ApiErrorHandler.handle(err));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCat();
  }, [catId]);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !cat) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file to update the cat photo.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);

    try {
      setCat(await catsApi.updatePrimaryPhoto(cat.id, file));
    } catch (err) {
      setPhotoError(ApiErrorHandler.handle(err));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const startEditingDetails = () => {
    if (!cat) return;
    setEditForm(catToEditForm(cat));
    setDetailsError(null);
    setDetailsSuccess(null);
    setIsEditingDetails(true);
  };

  const cancelEditingDetails = () => {
    setIsEditingDetails(false);
    setEditForm(null);
    setDetailsError(null);
  };

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cat || !editForm) return;

    const name = editForm.name.trim();
    if (!name) {
      setDetailsError("Cat name is required.");
      return;
    }

    setIsSavingDetails(true);
    setDetailsError(null);
    setDetailsSuccess(null);

    try {
      const updated = await catsApi.updateCat(cat.id, {
        name,
        sex: editForm.sex,
        color: editForm.color.trim() || null,
        estimatedBirthDate: editForm.estimatedBirthDate || null,
        intakeDate: editForm.intakeDate || null,
        microchipNumber: editForm.microchipNumber.trim() || null,
        sterilizationStatus: editForm.sterilizationStatus,
        status: editForm.status,
      });
      setCat(updated);
      setEditForm(catToEditForm(updated));
      setIsEditingDetails(false);
      setDetailsSuccess("Cat details were updated.");
    } catch (err) {
      setDetailsError(ApiErrorHandler.handle(err));
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
      <div className="mx-auto max-w-4xl">
        <Link href={cat?.currentLocationId ? `/locations/${cat.currentLocationId}` : "/locations"} className="text-sm font-medium text-[#d05a2c] hover:text-[#b24a20]">
          ← Back to {cat?.currentLocationName || "Locations"}
        </Link>

        {isLoading && <p className="mt-8 text-center text-sm text-[#6d6a66]">Loading cat profile...</p>}

        {!isLoading && error && (
          <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!isLoading && cat && (
          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
            <div className="space-y-4">
              <CatCard cat={cat} showProfileLink={false} />
              <section className="rounded-2xl border border-[#d4c7b4] bg-white/60 p-4 shadow-sm">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Photo</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">Edit primary photo</h2>
                <p className="mt-1 text-sm text-[#6d6a66]">Upload a new image to replace the card photo.</p>
                <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#d05a2c]/30 bg-[#d05a2c]/10 px-4 text-sm font-semibold text-[#b24a20] transition hover:bg-[#d05a2c]/20 has-disabled:cursor-not-allowed has-disabled:opacity-60">
                  {isUploadingPhoto ? "Uploading..." : cat.primaryPhotoUrl ? "Replace photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto}
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>
                {photoError && <p className="mt-3 text-sm font-medium text-red-700">{photoError}</p>}
              </section>
            </div>
            <section className="rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Cat profile</p>
                  <h1 className="mt-1 text-4xl font-semibold text-gray-900">{cat.name}</h1>
                </div>
                {!isEditingDetails && (
                  <button
                    type="button"
                    onClick={startEditingDetails}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
                  >
                    Edit details
                  </button>
                )}
              </div>

              {(detailsError || detailsSuccess) && (
                <div className={`mt-5 rounded-lg border p-4 ${detailsError ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
                  <p className={`text-sm font-medium ${detailsError ? "text-red-800" : "text-green-800"}`}>
                    {detailsError || detailsSuccess}
                  </p>
                </div>
              )}

              {isEditingDetails && editForm ? (
                <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Name *
                      <input
                        value={editForm.name}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, name: event.target.value })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Color
                      <input
                        value={editForm.color}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, color: event.target.value })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Sex
                      <select
                        value={editForm.sex}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, sex: event.target.value as CatSex })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      >
                        <option value="UNKNOWN">Unknown</option>
                        <option value="FEMALE">Female</option>
                        <option value="MALE">Male</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Status
                      <select
                        value={editForm.status}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, status: event.target.value as CatStatus })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="ADOPTED">Adopted</option>
                        <option value="DECEASED">Deceased</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Sterilization
                      <select
                        value={editForm.sterilizationStatus}
                        onChange={(event) =>
                          setEditForm((prev) => prev && { ...prev, sterilizationStatus: event.target.value as SterilizationStatus })
                        }
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      >
                        <option value="UNKNOWN">Unknown</option>
                        <option value="STERILIZED">Sterilized</option>
                        <option value="NOT_STERILIZED">Not sterilized</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Microchip number
                      <input
                        value={editForm.microchipNumber}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, microchipNumber: event.target.value })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Intake date
                      <input
                        type="date"
                        value={editForm.intakeDate}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, intakeDate: event.target.value })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-gray-800">
                      Estimated birth date
                      <input
                        type="date"
                        value={editForm.estimatedBirthDate}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, estimatedBirthDate: event.target.value })}
                        className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelEditingDetails}
                      className="rounded-xl border border-[#d4c7b4] bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSavingDetails}
                      className="rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingDetails ? "Saving..." : "Save details"}
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="mt-6 grid gap-4">
                  <div className="rounded-xl border border-[#d4c7b4] bg-white/50 p-4">
                    <dt className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Current location</dt>
                    <dd className="mt-1 font-semibold">{cat.currentLocationName || "Not assigned"}</dd>
                  </div>
                  <div className="rounded-xl border border-[#d4c7b4] bg-white/50 p-4">
                    <dt className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Cat ID</dt>
                    <dd className="mt-1 break-words font-mono text-sm font-medium">{cat.id}</dd>
                  </div>
                  <div className="rounded-xl border border-[#d4c7b4] bg-white/50 p-4">
                    <dt className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Last updated</dt>
                    <dd className="mt-1 font-semibold">{formatDate(cat.updatedAt)}</dd>
                  </div>
                </dl>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
