import crypto from "node:crypto";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export function verifyResendWebhook(input: {
  payload: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  now?: number;
}): boolean {
  const { payload, id, timestamp, signature, secret } = input;
  if (!id || !timestamp || !signature || !secret.startsWith("whsec_")) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = input.now ?? Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  if (secretBytes.length === 0) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${payload}`)
    .digest();

  return signature.split(" ").some((versionedSignature) => {
    const [version, encodedSignature] = versionedSignature.split(",", 2);
    if (version !== "v1" || !encodedSignature) {
      return false;
    }

    const actual = Buffer.from(encodedSignature, "base64");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  });
}
