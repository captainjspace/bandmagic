import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { deleteNote, getNote, updateNote } from "@/lib/firestore";
import { userEmail } from "@/lib/identity";

type Ctx = { params: Promise<{ id: string; noteId: string }> };

/** Only a note's author may change it. */
async function authorize(req: NextRequest, id: string, noteId: string) {
  const email = userEmail(req.headers);
  const note = await getNote(id, noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!email || note.author !== email)
    return NextResponse.json(
      { error: "Only the author can change a note." },
      { status: 403 },
    );
  return null;
}

/** PATCH { text } — fix a typo in your own note. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, noteId } = await params;
  const text = String((await req.json()).text ?? "").trim();
  if (!text)
    return NextResponse.json({ error: "Text required." }, { status: 400 });
  if (config.useMock)
    return NextResponse.json({
      id: noteId,
      text,
      editedAt: new Date().toISOString(),
    });
  const denied = await authorize(req, id, noteId);
  if (denied) return denied;
  return NextResponse.json(await updateNote(id, noteId, text));
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id, noteId } = await params;
  if (config.useMock) return new NextResponse(null, { status: 204 });
  const denied = await authorize(req, id, noteId);
  if (denied) return denied;
  await deleteNote(id, noteId);
  return new NextResponse(null, { status: 204 });
}
