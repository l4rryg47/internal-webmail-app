export function formatFromHeader(displayName: string, email: string) {
  const safeName = displayName.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  if (!safeName) {
    return email;
  }

  const quotedName = safeName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${quotedName}" <${email}>`;
}

export function extractEmailAddress(value: string) {
  const match = value.match(/<([^<>]+)>/);
  return (match?.[1] ?? value).trim();
}
