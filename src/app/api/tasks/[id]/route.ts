import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { deleteTask, updateTask } from "@/lib/firestore";
import { userEmail } from "@/lib/identity";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { done } — completing stamps who/when. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const done = (await req.json()).done === true;
  const patch = done
    ? {
        done,
        completedAt: new Date().toISOString(),
        completedBy: userEmail(req.headers) ?? "unknown",
      }
    : { done };
  if (config.useMock) return NextResponse.json({ id, ...patch });
  return NextResponse.json(await updateTask(id, patch));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (config.useMock) return new NextResponse(null, { status: 204 });
  await deleteTask(id);
  return new NextResponse(null, { status: 204 });
}
