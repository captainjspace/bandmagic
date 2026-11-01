import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { createTask, getTasks } from "@/lib/firestore";
import { userEmail } from "@/lib/identity";
import type { Task } from "@/types";

/** GET /api/tasks?assignee=me|<email>&targetId= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const raw = sp.get("assignee");
  const assignee =
    raw === "me" ? (userEmail(req.headers) ?? undefined) : (raw ?? undefined);
  const targetId = sp.get("targetId") ?? undefined;
  if (config.useMock) return NextResponse.json([]);
  return NextResponse.json(await getTasks({ assignee, targetId }));
}

/** POST { title, assignee, target, dueDate? } */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Task>;
  const createdBy = userEmail(req.headers) ?? "unknown";
  const title = body.title?.trim();
  const assignee = body.assignee?.trim();
  if (!title || !assignee || !body.target?.id)
    return NextResponse.json(
      { error: "title, assignee and target are required." },
      { status: 400 },
    );
  const task = {
    title,
    assignee,
    target: body.target,
    createdBy,
    ...(body.dueDate ? { dueDate: body.dueDate } : {}),
  };
  if (config.useMock)
    return NextResponse.json(
      {
        id: `mock-${Date.now()}`,
        ...task,
        done: false,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  return NextResponse.json(await createTask(task), { status: 201 });
}
