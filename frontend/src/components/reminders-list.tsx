"use client";

import Link from "next/link";
import { useState } from "react";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CatTask, MyReminder, User } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function RemindersList({
  tasks,
  cats,
  users,
  dashboard,
  isLoading,
  hasError,
  actionId,
  onEdit,
  onToggle,
  onDelete,
}: {
  tasks: CatTask[];
  cats: MyReminder[];
  users: User[];
  dashboard: boolean;
  isLoading: boolean;
  hasError: boolean;
  actionId: string | null;
  onEdit: (task: CatTask) => void;
  onToggle: (task: CatTask) => void;
  onDelete: (task: CatTask) => void;
}) {
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [page, setPage] = useState(1);
  const filteredTasks = tasks
    .filter((task) =>
      filter === "completed" ? Boolean(task.completedAt) : !task.completedAt,
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visibleTasks = filteredTasks.slice(
    (currentPage - 1) * 20,
    currentPage * 20,
  );
  return (
    <>
      <div
        aria-label="Filter tasks"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        {(
          [
            ["active", "Active"],
            ["completed", "Completed"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === value ? "border-[#b24a20] bg-[#d05a2c] text-white" : "border-[#d4c7b4] bg-white/60 text-[#4d514b] hover:bg-[#efe7da]"}`}
          >
            {label}
          </button>
        ))}
        {!isLoading && !hasError && (
          <span
            aria-live="polite"
            className="ml-auto rounded-full bg-[#efe7da] px-3 py-1 text-sm font-semibold"
          >
            {filteredTasks.length}{" "}
            {filteredTasks.length === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
      {!isLoading && !hasError && filteredTasks.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-[#d4c7b4] p-4 text-sm text-[#6d6a66]">
          {dashboard ? "No tasks in this view." : "No reminders yet."}
        </p>
      )}
      <ol className="mt-4 space-y-3">
        {visibleTasks.map((task) => {
          const cat = dashboard
            ? cats.find((item) => item.id === task.id)?.cat
            : undefined;
          return (
            <li
              key={task.id}
              className="rounded-xl border border-[#d4c7b4] bg-white/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`${task.completedAt ? "Reopen" : "Complete"} reminder: ${task.comment}`}
                    title={
                      task.completedAt ? "Reopen reminder" : "Complete reminder"
                    }
                    checked={Boolean(task.completedAt)}
                    disabled={
                      actionId === task.id || task.canComplete === false
                    }
                    onChange={() => onToggle(task)}
                    className="mt-1 h-4 w-4 accent-[#31734b] disabled:opacity-60"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {cat && (
                        <>
                          <Link
                            className="font-semibold text-[#b24a20] underline"
                            href={`/cats/${cat.id}`}
                          >
                            {cat.name} #{cat.nameNumber}
                          </Link>
                          {" · "}
                        </>
                      )}
                      <span>{task.comment}</span>
                    </p>
                    <p className="mt-1 text-sm text-[#6d6a66]">
                      {formatDate(task.dueDate)}
                    </p>
                    <p className="mt-1 text-xs text-[#6d6a66]">
                      Receivers:{" "}
                      {task.receiverIds
                        .map(
                          (id) =>
                            users.find((user) => user.id === id)?.fullName ||
                            users.find((user) => user.id === id)?.email ||
                            id,
                        )
                        .join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    aria-label="Edit reminder"
                    title="Edit reminder"
                    className="rounded-lg p-2 text-amber-700 hover:bg-amber-100"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button
                    type="button"
                    disabled={actionId === task.id}
                    onClick={() => onDelete(task)}
                    aria-label="Delete reminder"
                    title="Delete reminder"
                    className="rounded-lg p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {pageCount > 1 && (
        <nav
          aria-label="Reminder pages"
          className="mt-4 flex items-center justify-center gap-3 text-sm"
        >
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            className="rounded-lg border border-[#d4c7b4] px-3 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
            className="rounded-lg border border-[#d4c7b4] px-3 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
