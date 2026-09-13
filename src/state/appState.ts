import { createEmptySession, type SensorSession } from '../types/sensor';
import { clearDraft, loadDraft, saveDraft } from '../services/storage';

let session: SensorSession = createEmptySession();
const listeners = new Set<() => void>();

export function getSession(): SensorSession {
  return session;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

export async function updateSession(patch: Partial<SensorSession>): Promise<void> {
  session = { ...session, ...patch };
  notify();
  await saveDraft(session);
}

export async function resetSession(): Promise<void> {
  session = createEmptySession();
  notify();
  await clearDraft();
}

export async function restoreDraftIfAny(): Promise<boolean> {
  const draft = await loadDraft();
  if (draft && Object.keys(draft.photos).length > 0) {
    session = draft;
    notify();
    return true;
  }
  return false;
}
