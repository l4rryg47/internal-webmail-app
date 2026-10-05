import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const signatureHtml = typeof body.signatureHtml === "string" ? body.signatureHtml : "";

    await db.user.update({
      where: { id: user.id },
      data: { signatureHtml },
    });

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}
