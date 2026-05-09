export type ProjectRecord = {
  projectId: string;
  destinationUrl: string;
  createdAt: string;
};

const key = (projectId: string) => `project:${projectId}`;

export async function getProject(
  kv: KVNamespace,
  projectId: string,
): Promise<ProjectRecord | null> {
  const raw = await kv.get(key(projectId));
  if (!raw) return null;
  const stored = JSON.parse(raw) as Omit<ProjectRecord, "projectId">;
  return { projectId, ...stored };
}

export async function putProject(
  kv: KVNamespace,
  record: ProjectRecord,
): Promise<void> {
  const { projectId, ...stored } = record;
  await kv.put(key(projectId), JSON.stringify(stored));
}

export async function deleteProject(
  kv: KVNamespace,
  projectId: string,
): Promise<void> {
  await kv.delete(key(projectId));
}
