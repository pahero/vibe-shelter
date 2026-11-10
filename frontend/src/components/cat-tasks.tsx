"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  CatTask,
  catsApi,
  locationsApi,
  TaskInput,
  User,
  MyReminder,
  usersApi,
} from "@/lib/api";
import { ApiErrorHandler } from "@/lib/utils";
import { CatProfileSectionHeader } from "@/components/cat-profile-section-header";
import { RemindersList } from "@/components/reminders-list";

const emptyTask = (): TaskInput => ({
  comment: "",
  dueDate: "",
  receiverIds: [],
});

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CatTasks({
  catId,
  currentLocationId,
  onChanged,
  dashboard = false,
}: {
  catId?: string;
  currentLocationId?: string | null;
  onChanged?: () => Promise<void>;
  dashboard?: boolean;
}) {
  const [tasks, setTasks] = useState<CatTask[]>([]);
  const [reminders, setReminders] = useState<MyReminder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<TaskInput>(emptyTask);
  const [receiverChoice, setReceiverChoice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const defaultsRequest = useRef(0);

  useEffect(() => {
    setIsLoadingDefaults(false);
    return () => {
      defaultsRequest.current += 1;
    };
  }, [catId, currentLocationId]);

  const loadTasks = useCallback(async () => {
    if (!dashboard) {
      return {
        tasks: catId ? await catsApi.listTasks(catId) : [],
        reminders: [],
      };
    }
    const assigned = await catsApi.listMyReminders();
    return {
      reminders: assigned,
      tasks: assigned,
    };
  }, [catId, dashboard]);

  const refresh = async () => {
    const result = await loadTasks();
    setTasks(result.tasks);
    setReminders(result.reminders);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadTasks(), usersApi.listReminderReceivers()])
      .then(([result, loadedUsers]) => {
        if (!cancelled) {
          setTasks(result.tasks);
          setReminders(result.reminders);
          setUsers(loadedUsers.filter((user) => user.status === "active"));
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(ApiErrorHandler.handle(reason));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadTasks]);

  const toggleReceiver = (userId: string) =>
    setForm((current) => ({
      ...current,
      receiverIds: current.receiverIds.includes(userId)
        ? current.receiverIds.filter((id) => id !== userId)
        : [...current.receiverIds, userId],
    }));
  const selectedReceivers = form.receiverIds.map(
    (id) =>
      users.find((user) => user.id === id) ?? {
        id,
        fullName: null,
        email: id,
        status: "inactive" as const,
        isTest: false,
      },
  );

  const openNewTask = async () => {
    const request = ++defaultsRequest.current;
    setEditingId(null);
    setForm(emptyTask());
    setReceiverChoice("");
    setError(null);
    setIsExpanded(true);
    setIsFormOpen(false);
    setIsLoadingDefaults(true);
    try {
      const location = currentLocationId
        ? await locationsApi.getLocation(currentLocationId)
        : null;
      if (request !== defaultsRequest.current) return;
      setForm({
        ...emptyTask(),
        receiverIds:
          location?.owners
            .filter((owner) => owner.status === "ACTIVE" && !owner.deletedAt)
            .map((owner) => owner.id) ?? [],
      });
      setIsFormOpen(true);
    } catch (reason) {
      if (request === defaultsRequest.current)
        setError(
          `Could not load responsible users: ${ApiErrorHandler.handle(reason)}`,
        );
    } finally {
      if (request === defaultsRequest.current) setIsLoadingDefaults(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !form.comment.trim() ||
      !form.dueDate ||
      form.receiverIds.length === 0
    ) {
      setError(
        "Enter a comment, date, and at least one notification receiver.",
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        comment: form.comment.trim(),
        dueDate: new Date(form.dueDate).toISOString(),
      };
      if (editingId) await catsApi.updateTask(editingId, payload);
      else if (catId) await catsApi.createTask(catId, payload);
      setForm(emptyTask());
      setEditingId(null);
      setReceiverChoice("");
      setIsFormOpen(false);
      await refresh();
      await onChanged?.();
    } catch (reason) {
      setError(ApiErrorHandler.handle(reason));
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (task: CatTask) => {
    defaultsRequest.current += 1;
    setIsLoadingDefaults(false);
    setEditingId(task.id);
    setForm({
      comment: task.comment,
      dueDate: toLocalDateTime(task.dueDate),
      receiverIds: task.receiverIds,
    });
    setReceiverChoice("");
    setError(null);
    setIsFormOpen(true);
    setIsExpanded(true);
  };

  const cancel = () => {
    defaultsRequest.current += 1;
    setIsLoadingDefaults(false);
    setEditingId(null);
    setForm(emptyTask());
    setReceiverChoice("");
    setError(null);
    setIsFormOpen(false);
  };

  const runAction = async (taskId: string, action: () => Promise<unknown>) => {
    setActionId(taskId);
    setError(null);
    try {
      await action();
      await refresh();
      await onChanged?.();
    } catch (reason) {
      setError(ApiErrorHandler.handle(reason));
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className={dashboard ? undefined : "md:col-span-2"}>
      {!dashboard && (
        <CatProfileSectionHeader
          title="Reminders"
          isExpanded={isExpanded}
          onToggle={() => {
            if (isExpanded) cancel();
            setIsExpanded((current) => !current);
          }}
          onAdd={dashboard || isLoadingDefaults ? undefined : openNewTask}
          addLabel="Add reminder"
        />
      )}

      {isExpanded && (
        <>
          {isLoadingDefaults && (
            <p className="mt-3 text-sm text-[#6d6a66]">
              Loading responsible users...
            </p>
          )}
          {isFormOpen && (
            <form
              onSubmit={submit}
              className="mt-3 grid min-w-0 gap-3 rounded-xl border border-[#d4c7b4] bg-white/50 p-4 md:grid-cols-2"
            >
              <label className="grid min-w-0 gap-1 text-sm font-medium text-gray-800">
                <span>
                  Comment <span className="text-red-700">*</span>
                </span>
                <input
                  aria-label="Comment"
                  value={form.comment}
                  onChange={(event) =>
                    setForm({ ...form, comment: event.target.value })
                  }
                  className="w-full min-w-0 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
                />
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-gray-800">
                <span>
                  Date <span className="text-red-700">*</span>
                </span>
                <input
                  aria-label="Date"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm({ ...form, dueDate: event.target.value })
                  }
                  className="w-full min-w-0 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
                />
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-gray-800 md:col-span-2">
                <span>
                  Notification receivers <span className="text-red-700">*</span>
                </span>
                <select
                  aria-label="Notification receivers"
                  value={receiverChoice}
                  onChange={(event) => {
                    const userId = event.target.value;
                    if (userId) toggleReceiver(userId);
                    setReceiverChoice("");
                  }}
                  className="w-full min-w-0 rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"
                >
                  <option value="">Choose a receiver...</option>
                  {users.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                      disabled={form.receiverIds.includes(user.id)}
                    >
                      {user.fullName || "Unnamed user"}
                    </option>
                  ))}
                </select>
              </label>
              {selectedReceivers.length > 0 && (
                <div className="flex flex-wrap gap-1 md:col-span-2">
                  {selectedReceivers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1 rounded-full bg-[#d05a2c]/10 py-1 pl-2 pr-1 text-xs font-semibold text-[#b24a20]"
                    >
                      {user.fullName || "Unnamed user"}
                      <button
                        type="button"
                        onClick={() => toggleReceiver(user.id)}
                        aria-label={`Remove ${user.fullName || "Unnamed user"}`}
                        title={`Remove ${user.fullName || "Unnamed user"}`}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-[#d05a2c]/20"
                      >
                        <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 md:col-span-2">
                <button
                  disabled={isSaving}
                  className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-xl border border-[#d4c7b4] px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {isLoading && (
            <p className="mt-4 text-sm text-[#6d6a66]">Loading reminders...</p>
          )}
          <RemindersList
            tasks={tasks}
            cats={reminders}
            users={users}
            dashboard={dashboard}
            isLoading={isLoading}
            hasError={Boolean(error)}
            actionId={actionId}
            onEdit={edit}
            onToggle={(task) =>
              void runAction(task.id, () =>
                task.completedAt
                  ? catsApi.reopenTask(task.id)
                  : catsApi.completeTask(task.id),
              )
            }
            onDelete={(task) =>
              void runAction(task.id, () => catsApi.deleteTask(task.id))
            }
          />
        </>
      )}
    </section>
  );
}
