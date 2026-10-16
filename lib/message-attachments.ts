export const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export interface MessageAttachment {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export class AttachmentValidationError extends Error {}

export async function parseMessageAttachments(formData: FormData): Promise<MessageAttachment[]> {
  const entries = formData.getAll("attachments");
  if (entries.some((entry) => typeof entry === "string")) {
    throw new AttachmentValidationError("Attachments must be uploaded as files.");
  }

  const files = entries.filter((entry): entry is File => typeof entry !== "string" && entry.name.length > 0);
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
    throw new AttachmentValidationError("Attachments must total 25 MB or less.");
  }

  return Promise.all(files.map(async (file) => {
    const filename = file.name.replace(/[\\/\r\n\0]/g, "_").trim();
    if (!filename) {
      throw new AttachmentValidationError("Attachment filenames cannot be blank.");
    }

    return {
      filename,
      contentType: file.type || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
    };
  }));
}
