"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  faArrowLeft,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FlightInput, flightsApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/utils";

export function FlightCreateClient() {
  const router = useRouter();
  const photoUrls = useRef(new Set<string>());
  const [form, setForm] = useState<FlightInput>({
    date: new Date().toISOString().slice(0, 10),
    airport: "",
    flightNumber: "",
    flightParent: "",
    comment: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);

  useEffect(
    () => () => {
      photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const addedPhotos = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file);
      photoUrls.current.add(url);
      return { file, url };
    });
    setPhotos((current) => [...current, ...addedPhotos]);
  };

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url);
    photoUrls.current.delete(url);
    setPhotos((current) => current.filter((photo) => photo.url !== url));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const flight = await flightsApi.create({
        ...form,
        airport: form.airport.trim(),
        flightNumber: form.flightNumber?.trim() || null,
        flightParent: form.flightParent?.trim() || null,
        comment: form.comment?.trim() || null,
      });
      await Promise.all(
        photos.map(({ file }) => flightsApi.addPhoto(flight.id, file)),
      );
      photos.forEach(({ url }) => {
        URL.revokeObjectURL(url);
        photoUrls.current.delete(url);
      });
      router.push(`/flights/${flight.id}`);
    } catch (reason) {
      setError(ApiErrorHandler.handle(reason));
      setIsSaving(false);
    }
  };

  return (
    <main className="relative min-h-dvh w-full animate-rise">
      <Link
        href="/flights"
        aria-label="Back to flights"
        title="Back to flights"
        className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
      >
        <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
      </Link>
      <section className="mx-auto mt-5 w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-gray-900">Add flight</h1>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800"
          >
            {error}
          </p>
        )}
        <form
          onSubmit={submit}
          className="mt-5 rounded-2xl border border-[#d4c7b4] bg-white/60 p-4"
        >
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
              <span>Flight parent</span>
              <input
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
            <div className="md:col-span-2">
              <div className="mt-1 grid w-fit grid-cols-4 gap-2">
                <label
                  title="Add photos"
                  className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#b24a20] bg-[#fff8ee] text-xl text-[#d05a2c] transition hover:bg-[#f1d8c7]/45 has-disabled:cursor-not-allowed has-disabled:opacity-60"
                >
                  <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                  <input
                    type="file"
                    aria-label="Add photos"
                    title="Add photos"
                    accept="image/*"
                    multiple
                    disabled={isSaving}
                    onChange={(event) => {
                      addPhotos(event.target.files);
                      event.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
                {photos.map((photo) => (
                  <div
                    key={photo.url}
                    className="relative overflow-hidden rounded-lg border border-[#d4c7b4] bg-[#fff8ee]"
                  >
                    <img
                      src={photo.url}
                      alt={`Selected: ${photo.file.name}`}
                      className="h-16 w-16 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.url)}
                      disabled={isSaving}
                      aria-label={`Remove ${photo.file.name}`}
                      title={`Remove ${photo.file.name}`}
                      className="absolute right-0 top-0 rounded-bl-lg bg-white/90 p-1.5 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Link
              href="/flights"
              className="rounded-xl border border-[#d4c7b4] bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
