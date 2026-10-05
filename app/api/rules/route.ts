import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";

const RulePayload = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  priority: z.coerce.number().int().default(100),
  stopProcessing: z.boolean().default(false),
  conditionLogic: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.any(),
  actions: z.array(z.any()).default([]),
});

export async function GET() {
  try {
    const user = await requireUser();
    const rules = await db.rule.findMany({
      where: { userId: user.id },
      orderBy: { priority: "asc" },
    });

    return NextResponse.json(rules);
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const parsed = RulePayload.safeParse(body);

    if (!parsed.success) {
      return jsonError("INVALID_INPUT", "Rule payload is invalid.", 400);
    }

    const rule = await db.rule.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        enabled: parsed.data.enabled,
        priority: parsed.data.priority,
        stopProcessing: parsed.data.stopProcessing,
        conditionLogic: parsed.data.conditionLogic,
        conditions: parsed.data.conditions,
        actions: parsed.data.actions,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}
