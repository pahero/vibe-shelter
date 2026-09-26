"use client";

import { FormEvent, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faPlus } from "@fortawesome/free-solid-svg-icons";
import { CatTask, catsApi, TaskInput, User, usersApi } from "@/lib/api";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

const emptyTask = (): TaskInput => ({ comment: "", dueDate: "", receiverIds: [] });

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CatTasks({ catId, onChanged }: { catId: string; onChanged?: () => Promise<void> }) {
  const [tasks, setTasks] = useState<CatTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<TaskInput>(emptyTask);
  const [receiverChoice, setReceiverChoice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => setTasks(await catsApi.listTasks(catId));

  useEffect(() => {
    let cancelled = false;
    Promise.all([catsApi.listTasks(catId), usersApi.listUsers()])
      .then(([loadedTasks, loadedUsers]) => {
        if (!cancelled) {
          setTasks(loadedTasks);
          setUsers(loadedUsers.filter((user) => user.status === "active"));
        }
      })
      .catch((reason: unknown) => { if (!cancelled) setError(ApiErrorHandler.handle(reason)); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [catId]);

  const toggleReceiver = (userId: string) => setForm((current) => ({
    ...current,
    receiverIds: current.receiverIds.includes(userId)
      ? current.receiverIds.filter((id) => id !== userId)
      : [...current.receiverIds, userId],
  }));
  const selectedReceivers = users.filter((user) => form.receiverIds.includes(user.id));

  const openNewTask = () => {
    setEditingId(null);
    setForm(emptyTask());
    setReceiverChoice("");
    setError(null);
    setIsFormOpen(true);
    setIsExpanded(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.comment.trim() || !form.dueDate || form.receiverIds.length === 0) {
      setError("Enter a comment, due date, and at least one notification receiver.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = { ...form, comment: form.comment.trim(), dueDate: new Date(form.dueDate).toISOString() };
      if (editingId) await catsApi.updateTask(editingId, payload); else await catsApi.createTask(catId, payload);
      await refresh();
      await onChanged?.();
      setForm(emptyTask());
      setEditingId(null);
      setReceiverChoice("");
      setIsFormOpen(false);
    } catch (reason) { setError(ApiErrorHandler.handle(reason)); } finally { setIsSaving(false); }
  };

  const edit = (task: CatTask) => {
    setEditingId(task.id);
    setForm({ comment: task.comment, dueDate: toLocalDateTime(task.dueDate), receiverIds: task.receiverIds });
    setReceiverChoice("");
    setError(null);
    setIsFormOpen(true);
    setIsExpanded(true);
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyTask());
    setReceiverChoice("");
    setError(null);
    setIsFormOpen(false);
  };

  const runAction = async (taskId: string, action: () => Promise<unknown>) => {
    setActionId(taskId);
    setError(null);
    try { await action(); await refresh(); await onChanged?.(); } catch (reason) { setError(ApiErrorHandler.handle(reason)); } finally { setActionId(null); }
  };

  return <section className="md:col-span-2 rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
    <div className="flex items-center justify-between gap-2">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Tasks</p>
      <div className="flex items-center gap-2">
        {isExpanded && <button type="button" onClick={openNewTask} aria-label="Add task" title="Add task" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#b24a20] bg-[#d05a2c] text-sm text-white transition hover:bg-[#b24a20]"><FontAwesomeIcon icon={faPlus} /></button>}
        <button type="button" onClick={() => { if (isExpanded) cancel(); setIsExpanded((current) => !current); }} aria-label={isExpanded ? "Hide tasks" : "Show tasks"} title={isExpanded ? "Hide tasks" : "Show tasks"} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#d4c7b4] bg-white text-sm text-gray-800 transition hover:bg-[#fff0e8]"><FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} /></button>
      </div>
    </div>

    {isExpanded && <>
    {isFormOpen && <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-[#d4c7b4] bg-white/50 p-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium text-gray-800"><span>Comment <span className="text-red-700">*</span></span><input aria-label="Comment" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-medium text-gray-800"><span>Due date <span className="text-red-700">*</span></span><input aria-label="Due date" type="datetime-local" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2"><span>Notification receivers <span className="text-red-700">*</span></span><select aria-label="Notification receivers" value={receiverChoice} onChange={(event) => { const userId = event.target.value; if (userId) toggleReceiver(userId); setReceiverChoice(""); }} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2"><option value="">Choose a receiver...</option>{users.map((user) => <option key={user.id} value={user.id} disabled={form.receiverIds.includes(user.id)}>{user.fullName || user.email}{user.fullName ? ` (${user.email})` : ""}</option>)}</select></label>
      {selectedReceivers.length > 0 && <div className="flex flex-wrap gap-1 md:col-span-2">{selectedReceivers.map((user) => <button key={user.id} type="button" onClick={() => toggleReceiver(user.id)} className="rounded-full bg-[#d05a2c]/10 px-2 py-1 text-xs font-semibold text-[#b24a20]">{user.fullName || user.email} ×</button>)}</div>}
      <div className="flex gap-2 md:col-span-2"><button disabled={isSaving} className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save"}</button><button type="button" onClick={cancel} className="rounded-xl border border-[#d4c7b4] px-4 py-2 text-sm font-semibold">Cancel</button></div>
    </form>}

    {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    {isLoading && <p className="mt-4 text-sm text-[#6d6a66]">Loading tasks...</p>}
    {!isLoading && tasks.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#d4c7b4] p-4 text-sm text-[#6d6a66]">No care tasks yet.</p>}
    <ol className="mt-4 space-y-3">{tasks.map((task) => <li key={task.id} className="rounded-xl border border-[#d4c7b4] bg-white/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className={`font-semibold ${task.completedAt ? "text-[#6d6a66] line-through" : "text-gray-900"}`}>{task.comment}</p><p className="mt-1 text-sm text-[#6d6a66]">Due {formatDate(task.dueDate)}{task.completedAt && ` · Completed ${formatDate(task.completedAt)} by ${task.completedBy?.fullName || task.completedBy?.id}`}</p><p className="mt-1 text-xs text-[#6d6a66]">Receivers: {task.receiverIds.map((id) => users.find((user) => user.id === id)?.fullName || users.find((user) => user.id === id)?.email || id).join(", ")}</p></div><div className="flex gap-2">{!task.completedAt && <button type="button" disabled={actionId === task.id} onClick={() => runAction(task.id, () => catsApi.completeTask(task.id))} className="rounded-lg bg-[#31734b] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Complete</button>}<button type="button" onClick={() => edit(task)} className="text-sm font-semibold text-amber-700 hover:text-amber-800">Edit</button><button type="button" disabled={actionId === task.id} onClick={() => runAction(task.id, () => catsApi.deleteTask(task.id))} className="text-sm font-semibold text-red-700 hover:text-red-800 disabled:opacity-50">Delete</button></div></div></li>)}</ol>
    </>}
  </section>;
}
