import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { MailboxSettingsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const parsed = MailboxSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_INPUT", "One or more mailbox settings are invalid.", 400);
  }

  await db.user.update({
    where: { id: user.id },
    data: parsed.data,
  });

  return NextResponse.redirect(new URL("/settings", request.url));
}
