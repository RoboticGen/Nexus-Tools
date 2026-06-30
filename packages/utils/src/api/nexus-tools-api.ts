import { fetchWithAuthJSON } from "./fetchWithAuth";

export type NexusToolPlatform = "OBO_CODE" | "OBO_BLOCKS" | "OBO_PLAYGROUND";

export interface NexusToolFile {
  id: string;
  userEmail: string;
  platform: NexusToolPlatform;
  fileName: string;
  fileContent: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NexusFilesResponse {
  files: NexusToolFile[];
  total: number;
}

export async function listNexusFiles(
  apiUrl: string,
  platform: NexusToolPlatform
): Promise<NexusFilesResponse> {
  const url = `${apiUrl}/nexus-tools/files?platform=${platform}`;
  return fetchWithAuthJSON<NexusFilesResponse>(url);
}

export async function saveNexusFile(
  apiUrl: string,
  platform: NexusToolPlatform,
  file_name: string,
  code: string
): Promise<NexusToolFile> {
  return fetchWithAuthJSON<NexusToolFile>(`${apiUrl}/nexus-tools/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, fileName: file_name, fileContent: { code } }),
  });
}

export async function deleteNexusFile(
  apiUrl: string,
  id: string
): Promise<void> {
  await fetchWithAuthJSON<{ success: boolean }>(
    `${apiUrl}/nexus-tools/files/${id}`,
    { method: "DELETE" }
  );
}

export function extractNexusFileContent(
  fileContent: Record<string, unknown>
): string {
  if (typeof fileContent.code === "string") return fileContent.code;
  if (typeof fileContent.content === "string") return fileContent.content;
  return JSON.stringify(fileContent, null, 2);
}
