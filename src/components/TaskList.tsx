"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/types";

const targetHref = (t: Task["target"]) =>
  t.kind === "track-group"
    ? `/track-group/${t.id}`
    : `/browse?editSong=${encodeURIComponent(t.id)}`;

const short = (email: string) => email.split("@")[0];

function TaskRow({
  task,
  showTarget,
  onToggle,
  onDelete,
}: {
  task: Task;
  showTarget: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className={task.done ? "rb-task rb-task-done" : "rb-task"}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        aria-label={task.done ? "Reopen task" : "Mark task complete"}
        className="mt-0.5 accent-rbyellow-500"
      />
      <div className="min-w-0 flex-1">
        <p className="rb-task-title">{task.title}</p>
        <p className="tg-meta">
          {short(task.assignee)}
          {task.dueDate && ` · due ${task.dueDate}`}
          {showTarget && (
            <>
              {" · "}
              <Link href={targetHref(task.target)} className="rb-nav-link">
                {task.target.name}
              </Link>
            </>
          )}
        </p>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete task"
          className="rb-player-icon-btn"
        >
          ×
        </button>
      )}
    </li>
  );
}

/** Tasks on one target (track group or song), with an add form — or, with
 *  `mine`, the caller's own tasks across every target (no add form). */
export function TaskList({
  target,
  mine = false,
}: {
  target?: Task["target"];
  mine?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [me, setMe] = useState("");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");

  const query = mine
    ? "assignee=me"
    : `targetId=${encodeURIComponent(target?.id ?? "")}`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks?${query}`);
    if (res.ok) setTasks(await res.json());
  }, [query]);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((u) => setMe(u.email ?? ""))
      .catch(() => {});
  }, [load]);

  const toggle = async (task: Task) => {
    setTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
  };

  const remove = async (task: Task) => {
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !title.trim()) return;
    setError("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        assignee: assignee.trim() || me,
        target,
        dueDate: dueDate || undefined,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Couldn't add task.");
      return;
    }
    const task = await res.json();
    setTasks((ts) => [...ts, task]);
    setTitle("");
    setDueDate("");
  };

  // Free-form assignee, suggested from everyone already seen on tasks.
  const people = [
    ...new Set([me, ...tasks.flatMap((t) => [t.assignee, t.createdBy])]),
  ].filter(Boolean);
  const visible = mine ? tasks.filter((t) => !t.done) : tasks;

  return (
    <div className="space-y-3">
      {visible.length === 0 && (
        <p className="tg-meta">
          {mine ? "Nothing assigned to you." : "No tasks yet."}
        </p>
      )}
      <ul className="space-y-1.5">
        {visible.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            showTarget={mine}
            onToggle={() => toggle(t)}
            onDelete={mine ? undefined : () => remove(t)}
          />
        ))}
      </ul>
      {target && (
        <form onSubmit={add} className="rb-task-form">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task — e.g. listen, tag tracks, write notes"
            className="rb-input sm:flex-1"
          />
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            list={`task-people-${target.id}`}
            placeholder={me ? `assignee (${short(me)})` : "assignee email"}
            className="rb-input sm:w-48"
          />
          <datalist id={`task-people-${target.id}`}>
            {people.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date"
            className="rb-input sm:w-auto"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="rb-btn-secondary"
          >
            Add
          </button>
        </form>
      )}
      {error && <p className="rb-text-error">{error}</p>}
    </div>
  );
}
