import { CatHistoryEvent } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

export const eventLabels: Record<string, string> = {
  cat_created: "Cat created",
  cat_archived: "Cat archived",
  cat_dearchived: "Cat restored",
  name_changed: "Name changed",
  sex_changed: "Sex changed",
  color_changed: "Color changed",
  estimated_birth_date_changed: "Estimated birth date changed",
  intake_date_changed: "Intake date changed",
  rescue_source_changed: "Rescue source changed",
  microchip_number_changed: "Microchip number changed",
  passport_number_changed: "Passport number changed",
  sterilization_status_changed: "Neutering changed",
  status_changed: "Status changed",
  current_location_changed: "Current location changed",
  photo_created: "Photo added",
  photo_deleted: "Photo deleted",
  document_created: "Document uploaded",
  document_deleted: "Document removed",
  weight_created: "Weight added",
  weight_deleted: "Weight deleted",
  tag_added_to_cat: "Tag added",
  tag_removed_from_cat: "Tag removed",
  tag_create: "Tag created",
  tag_update: "Tag updated",
  tag_delete: "Tag deleted",
  location_create: "Location created",
  location_update: "Location updated",
  location_delete: "Location deleted",
  archivation_reason_create: "Archivation reason created",
  archivation_reason_update: "Archivation reason updated",
  archivation_reason_delete: "Archivation reason deleted",
  task_created: "Task created",
  task_comment_changed: "Task comment changed",
  task_due_date_changed: "Task due date changed",
  task_receivers_changed: "Task receivers changed",
  task_completed: "Task completed",
  task_deleted: "Task deleted",
};

type CatHistoryProps = {
  events: CatHistoryEvent[];
  isLoading: boolean;
  error: string | null;
};

export function historyValueText(value: string | null): string {
  return value ?? "Not set";
}

export function CatHistory({ events, isLoading, error }: CatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="md:col-span-2 rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Audit</span>
        <span className="text-sm font-semibold text-[#b24a20]">{isOpen ? "Hide" : "Show"}</span>
      </button>

      {isOpen && (
        <>
          {isLoading && <p className="mt-5 text-sm text-[#6d6a66]">Loading cat history...</p>}
          {error && <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

          {!isLoading && !error && events.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-6 text-center">
              <p className="text-sm text-[#6d6a66]">No changes have been recorded for this cat yet.</p>
            </div>
          )}

          {!isLoading && !error && events.length > 0 && (
            <ol className="mt-4 divide-y divide-[#d4c7b4] border-y border-[#d4c7b4]">
              {events.map((event) => (
                <li key={event.id} className="py-2.5">
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-0 text-gray-800">
                      <span className="font-semibold text-gray-900">{eventLabels[event.eventType] ?? event.eventType}</span>
                      <span className="text-[#6d6a66]"> by {event.actor.displayName || event.actor.email}</span>
                    </p>
                    <time className="shrink-0 text-xs font-medium text-[#6d6a66]" dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
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
          )}
        </>
      )}
    </section>
  );
}
