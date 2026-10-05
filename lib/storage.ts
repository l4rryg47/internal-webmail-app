import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredFile {
  storagePath: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export class LocalStorage {
  constructor(private readonly rootDir: string = process.env.STORAGE_PATH ?? "./storage") {}

  async saveFile(filename: string, content: Buffer, contentType: string): Promise<StoredFile> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const directory = path.resolve(this.rootDir);
    await mkdir(directory, { recursive: true });

    const storagePath = path.join(directory, `${Date.now()}-${safeName}`);
    await writeFile(storagePath, content);

    return {
      storagePath,
      filename: safeName,
      contentType,
      sizeBytes: content.length,
    };
  }
}
