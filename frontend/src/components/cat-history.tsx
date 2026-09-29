import { CatHistoryEvent } from "@/lib/api";
import { ApiErrorHandler, formatDate } from "@/lib/utils";
import { useState } from "react";
import { CatProfileSectionHeader } from "@/components/cat-profile-section-header";

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
  tag_name_changed: "Tag name changed",
  tag_color_changed: "Tag color changed",
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
  medical_note_created: "Medical note created",
  medical_note_deleted: "Medical note deleted",
  medical_note_date_changed: "Medical note date changed",
  medical_note_comment_changed: "Medical note comment changed",
  preventive_treatment_created: "Vaccination or parasite treatment created",
  preventive_treatment_deleted: "Vaccination or parasite treatment deleted",
  preventive_treatment_date_changed: "Vaccination or parasite treatment date changed",
  preventive_treatment_name_changed: "Vaccine or medicine changed",
  note_created: "Note created",
  note_deleted: "Note deleted",
  note_date_changed: "Note date changed",
  note_comment_changed: "Note comment changed",
};

type CatHistoryProps = {
  events: CatHistoryEvent[];
  isLoading: boolean;
  error: string | null;
  total?: number;
  skip?: number;
  limit?: number;
  onPageChange?: (skip: number) => void;
  onRestoreTreatment?: (treatmentId: string) => Promise<void>;
};

export function historyValueText(value: string | null): string {
  return value ?? "Not set";
}

export function auditEventStyle(eventType: string): string {
  if (eventType.endsWith("_created") || eventType.endsWith("_create") || eventType.endsWith("_restored") || eventType === "cat_dearchived") return "border-l-4 border-l-[#31734b] bg-[#31734b]/10";
  if (eventType.endsWith("_deleted") || eventType.endsWith("_delete") || eventType === "cat_archived") return "border-l-4 border-l-red-700 bg-red-50/70";
  return "border-l-4 border-l-amber-600 bg-amber-50/70";
}

function eventLabel(event: CatHistoryEvent): string {
  const administrationDate = event.treatmentAdministrationDate;
  if (event.treatment && administrationDate && event.eventType === "treatment_administration_checked") return `Treatment ${event.treatment.shortName} ${administrationDate} Checked`;
  if (event.treatment && administrationDate && event.eventType === "treatment_administration_unchecked") return `Treatment ${event.treatment.shortName} ${administrationDate} Unchecked`;
  if (event.treatment) {
    const treatmentActions: Record<string, string> = {
      treatment_created: "Created",
      treatment_deleted: "Deleted",
      treatment_restored: "Restored",
      treatment_short_name_changed: "Short name changed",
      treatment_start_date_changed: "Start date changed",
      treatment_end_date_changed: "End date changed",
      treatment_doses_per_day_changed: "Doses per day changed",
      treatment_instructions_changed: "Instructions changed",
    };
    const action = treatmentActions[event.eventType];
    if (action) return `Treatment ${event.treatment.shortName} ${action}`;
  }
  return eventLabels[event.eventType] ?? event.eventType;
}

export function CatHistory({ events, isLoading, error, total = events.length, skip = 0, limit = 50, onPageChange, onRestoreTreatment }: CatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [restoringTreatmentId, setRestoringTreatmentId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restoreTreatment = async (treatmentId: string) => { if (!onRestoreTreatment) return; setRestoringTreatmentId(treatmentId); setRestoreError(null); try { await onRestoreTreatment(treatmentId); } catch (reason) { setRestoreError(ApiErrorHandler.handle(reason)); } finally { setRestoringTreatmentId(null); } };

  return (
    <section className="overflow-hidden md:col-span-2 rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
      <CatProfileSectionHeader title="Audit" isExpanded={isOpen} onToggle={() => setIsOpen((open) => !open)} />

      {isOpen && (
        <>
          {isLoading && <p className="mt-5 text-sm text-[#6d6a66]">Loading cat history...</p>}
           {error && <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
           {restoreError && <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{restoreError}</p>}

          {!isLoading && !error && events.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-6 text-center">
              <p className="text-sm text-[#6d6a66]">No changes have been recorded for this cat yet.</p>
            </div>
          )}

          {!isLoading && !error && events.length > 0 && (
            <ol className="mt-4 divide-y divide-[#d4c7b4] border-y border-[#d4c7b4]">
              {events.map((event) => (
                <li key={event.id} className={`px-3 py-2.5 ${auditEventStyle(event.eventType)}`}>
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-0 text-gray-800">
                      <span className="font-semibold text-gray-900">{eventLabel(event)}</span>
                      <span className="text-[#6d6a66]"> by {event.actor.displayName || event.actor.email}</span>
                    </p>
                    <div className="flex shrink-0 items-center gap-2"><time className="text-xs font-medium text-[#6d6a66]" dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>{event.eventType === "treatment_deleted" && event.treatment?.isDeleted && onRestoreTreatment && <button type="button" disabled={restoringTreatmentId === event.treatment.id} onClick={() => void restoreTreatment(event.treatment!.id)} className="rounded-lg border border-[#31734b] px-2 py-1 text-xs font-semibold text-[#31734b] hover:bg-[#31734b]/10 disabled:cursor-not-allowed disabled:opacity-50">{restoringTreatmentId === event.treatment.id ? "Restoring..." : "Restore"}</button>}</div>
                  </div>

                  {event.photo ? (
                    <p className="mt-1 text-xs">
                      <a className="font-semibold text-[#b24a20] underline-offset-2 hover:underline" href={event.photo.link ?? "#"} target="_blank" rel="noreferrer">
                        {event.photo.status === "DELETED" ? "Open historical deleted-photo link" : "Open photo link"}
                      </a>
                    </p>
                  ) : event.document ? (
                    <p className="mt-1 text-xs">
                      <a className="font-semibold text-[#b24a20] underline-offset-2 hover:underline" href={event.document.link ?? "#"} target="_blank" rel="noreferrer">
                        Open {event.document.status === "DELETED" ? "removed " : ""}PDF: {event.document.fileName}
                      </a>
                    </p>
                  ) : event.oldValue !== null || event.newValue !== null ? (
                    <p className="mt-1 text-xs text-[#6d6a66]">{historyValueText(event.oldValue)} -&gt; {historyValueText(event.newValue)}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {!isLoading && !error && total > limit && <nav aria-label="Audit pagination" className="mt-4 flex items-center justify-between gap-3"><p className="text-sm text-[#6d6a66]">Showing {skip + 1}-{Math.min(skip + limit, total)} of {total}</p><div className="flex gap-2"><button type="button" onClick={() => onPageChange?.(Math.max(0, skip - limit))} disabled={skip === 0} className="rounded-lg border border-[#d4c7b4] px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Previous</button><button type="button" onClick={() => onPageChange?.(skip + limit)} disabled={skip + limit >= total} className="rounded-lg border border-[#d4c7b4] px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Next</button></div></nav>}
        </>
      )}
    </section>
  );
}
