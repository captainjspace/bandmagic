import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { createAsset, getAssets } from "@/lib/firestore";
import { userEmail } from "@/lib/identity";
import { mockAssets } from "@/lib/mock";

export async function GET() {
  if (config.useMock) {
    return NextResponse.json(mockAssets);
  }
  const assets = await getAssets();
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const author = userEmail(req.headers) ?? "unknown";

  if (config.useMock) {
    const now = new Date().toISOString();
    return NextResponse.json(
      {
        id: "mock-asset-new",
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        ...body,
        createdBy: author,
        updatedBy: author,
      },
      { status: 201 },
    );
  }

  const asset = await createAsset({
    ...body,
    createdBy: author,
    updatedBy: author,
  });
  return NextResponse.json(asset, { status: 201 });
}
