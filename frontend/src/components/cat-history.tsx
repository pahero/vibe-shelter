import { CatHistoryEvent } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const eventLabels: Record<string, string> = {
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
};

type CatHistoryProps = {
  events: CatHistoryEvent[];
  isLoading: boolean;
  error: string | null;
};

export function CatHistory({ events, isLoading, error }: CatHistoryProps) {
  return (
    <section className="md:col-span-2 rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Audit history</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-900">Cat history</h2>
      </div>

      {isLoading && <p className="mt-5 text-sm text-[#6d6a66]">Loading cat history...</p>}
      {error && <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

      {!isLoading && !error && events.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-6 text-center">
          <p className="text-sm text-[#6d6a66]">No changes have been recorded for this cat yet.</p>
        </div>
      )}

      {!isLoading && !error && events.length > 0 && (
        <ol className="mt-5 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-2xl border border-[#d4c7b4] bg-white/55 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{eventLabels[event.eventType] ?? event.eventType}</p>
                  <p className="mt-1 text-xs text-[#6d6a66]">By {event.actor.displayName || event.actor.email}</p>
                </div>
                <time className="text-xs font-medium text-[#6d6a66]" dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
              </div>

              {event.photo ? (
                <div className="mt-3 rounded-xl border border-[#d4c7b4]/70 bg-[#fff8ee] p-3 text-sm">
                  <a className="font-semibold text-[#b24a20] underline-offset-2 hover:underline" href={event.photo.link ?? "#"} target="_blank" rel="noreferrer">
                    {event.photo.status === "DELETED" ? "Open historical deleted-photo link" : "Open photo link"}
                  </a>
                </div>
              ) : (
                <div className="mt-3 grid gap-2 rounded-xl border border-[#d4c7b4]/70 bg-[#fff8ee] p-3 text-sm sm:grid-cols-2">
                  <p><span className="font-semibold text-[#6d6a66]">Old:</span> {event.oldValue ?? "Not set"}</p>
                  <p><span className="font-semibold text-[#6d6a66]">New:</span> {event.newValue ?? "Not set"}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
