import crypto from "node:crypto";
import { db } from "@/lib/db";

export async function createPasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2);

  await db.passwordResetToken.deleteMany({ where: { userId } });
  await db.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(token: string) {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.expiresAt.getTime() <= Date.now() || resetToken.usedAt) {
    return null;
  }

  await db.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return resetToken.user;
}
