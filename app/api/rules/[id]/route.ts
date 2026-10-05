import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";

const RulePayload = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  priority: z.coerce.number().int().optional(),
  stopProcessing: z.boolean().optional(),
  conditionLogic: z.enum(["AND", "OR"]).optional(),
  conditions: z.any().optional(),
  actions: z.array(z.any()).optional(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const parsed = RulePayload.safeParse(body);

    if (!parsed.success) {
      return jsonError("INVALID_INPUT", "Rule update payload is invalid.", 400);
    }

    const rule = await db.rule.update({
      where: { id: params.id, userId: user.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.stopProcessing !== undefined ? { stopProcessing: parsed.data.stopProcessing } : {}),
        ...(parsed.data.conditionLogic !== undefined ? { conditionLogic: parsed.data.conditionLogic } : {}),
        ...(parsed.data.conditions !== undefined ? { conditions: parsed.data.conditions } : {}),
        ...(parsed.data.actions !== undefined ? { actions: parsed.data.actions } : {}),
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await db.rule.delete({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}
