import { get, set, del } from 'idb-keyval';
import type { SensorSession } from '../types/sensor';

const DRAFT_KEY = 'faulty-sensors-draft-session';

export async function saveDraft(session: SensorSession): Promise<void> {
  await set(DRAFT_KEY, session);
}

export async function loadDraft(): Promise<SensorSession | undefined> {
  return get<SensorSession>(DRAFT_KEY);
}

export async function clearDraft(): Promise<void> {
  await del(DRAFT_KEY);
}
