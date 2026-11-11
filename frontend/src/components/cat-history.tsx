import { CatHistoryEvent } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ReactNode, useState } from "react";
import { CatProfileSectionHeader } from "@/components/cat-profile-section-header";

const eventLabels: Record<string, string> = {
  cat_created: "Cat created",
  cat_archived: "Cat archived",
  cat_dearchived: "Cat restored",
  flight_created: "Flight created",
  flight_deleted: "Flight deleted",
  flight_restored: "Flight restored",
  flight_cat_assigned: "Cat assigned",
  flight_cat_unassigned: "Cat removed",
  flight_cat_restored: "Cat assignment restored",
  preparation_fee_price_changed: "Preparation fee price changed",
  preparation_fee_paid_changed: "Preparation fee paid changed",
  flight_fee_price_changed: "Flight fee price changed",
  flight_fee_paid_changed: "Flight fee paid changed",
  pre_payer_name_changed: "Name of pre-payer changed",
  paid_by_adopter_changed: "Paid by adopter changed",
  adoption_contract_changed: "Adoption contract changed",
  adoption_form_changed: "Adoption form (Selbstauskunft) changed",
};

type CatHistoryProps = {
  events: CatHistoryEvent[];
  isLoading: boolean;
  error: string | null;
  total?: number;
  skip?: number;
  limit?: number;
  onPageChange?: (skip: number) => void;
  mode?: "cat" | "flight" | "management";
  title?: string;
  filters?: ReactNode;
  showCatName?: boolean;
};

export function auditEventStyle(eventType: string): string {
  if (
    eventType.endsWith("_created") ||
    eventType.endsWith("_create") ||
    eventType.endsWith("_restored") ||
    eventType === "cat_dearchived"
  )
    return "border-l-4 border-l-[#31734b] bg-[#31734b]/10";
  if (
    eventType.endsWith("_deleted") ||
    eventType.endsWith("_delete") ||
    eventType === "cat_archived"
  )
    return "border-l-4 border-l-red-700 bg-red-50/70";
  return "border-l-4 border-l-amber-600 bg-amber-50/70";
}

export function auditEventLabel(event: CatHistoryEvent): string {
  const label =
    eventLabels[event.eventType] ?? event.eventType.replaceAll("_", " ");
  if (event.treatmentShortName)
    return `Treatment ${event.treatmentShortName} · ${label}`;
  if (event.tagName) return `Tag ${event.tagName} · ${label}`;
  if (event.taskComment) return `Task “${event.taskComment}” · ${label}`;
  if (event.vaccineName) return `Vaccination ${event.vaccineName} · ${label}`;
  if (event.productName)
    return `Parasite treatment ${event.productName} · ${label}`;
  if (event.flightNumber || event.airport)
    return `Flight ${event.flightNumber ?? event.airport} · ${label}`;
  return label;
}

export function CatHistory({
  events,
  isLoading,
  error,
  total = events.length,
  skip = 0,
  limit = 50,
  onPageChange,
  mode = "cat",
  title = "Audit",
  filters,
  showCatName = false,
}: CatHistoryProps) {
  const [isOpen, setIsOpen] = useState(true);
  const scoped = mode !== "management";
  return (
    <section className={mode === "cat" ? "md:col-span-2" : ""}>
      {scoped ? (
        <CatProfileSectionHeader
          title={title}
          isExpanded={isOpen}
          onToggle={() => setIsOpen((open) => !open)}
        />
      ) : (
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      )}
      {isOpen && (
        <>
          {filters}
          {isLoading && (
            <p className="mt-5 text-sm text-[#6d6a66]">
              Loading audit history...
            </p>
          )}
          {error && (
            <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}
          {!isLoading && !error && events.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-6 text-center">
              <p className="text-sm text-[#6d6a66]">No audit records found.</p>
            </div>
          )}
          {!isLoading && !error && events.length > 0 && (
            <ol className="mt-4 divide-y divide-[#d4c7b4] border-y border-[#d4c7b4]">
              {events.map((event) => (
                <li
                  key={event.id}
                  className={`px-3 py-2.5 ${auditEventStyle(event.eventType)}`}
                >
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-0 text-gray-800">
                      <span className="font-semibold text-gray-900">
                        {auditEventLabel(event)}
                      </span>
                      <span className="text-[#6d6a66]">
                        {showCatName && event.catName
                          ? ` on ${event.catName}`
                          : ""}{" "}
                        by {event.actorFullName}
                      </span>
                    </p>
                    <time
                      className="shrink-0 text-xs font-medium text-[#6d6a66]"
                      dateTime={event.occurredAt}
                    >
                      {formatDate(event.occurredAt)}
                    </time>
                  </div>
                  {event.fileUrl ? (
                    <a
                      className="mt-1 block text-xs font-semibold text-[#b24a20] underline-offset-2 hover:underline"
                      href={event.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open linked file
                    </a>
                  ) : event.oldValue !== null || event.newValue !== null ? (
                    <p className="mt-1 text-xs text-[#6d6a66]">
                      {event.oldValue ?? "Not set"} -&gt;{" "}
                      {event.newValue ?? "Not set"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {!isLoading && !error && total > limit && (
            <nav
              aria-label="Audit pagination"
              className="mt-4 flex items-center justify-between gap-3"
            >
              <p className="text-sm text-[#6d6a66]">
                Showing {skip + 1}-{Math.min(skip + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onPageChange?.(Math.max(0, skip - limit))}
                  disabled={skip === 0}
                  className="rounded-lg border border-[#d4c7b4] px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange?.(skip + limit)}
                  disabled={skip + limit >= total}
                  className="rounded-lg border border-[#d4c7b4] px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
