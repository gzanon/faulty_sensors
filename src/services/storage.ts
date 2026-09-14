import { get, set, del } from 'idb-keyval';
import type { QueuedSensor, SensorSession } from '../types/sensor';

const DRAFT_KEY = 'faulty-sensors-draft-session';
const QUEUE_KEY = 'faulty-sensors-pending-queue';

export async function saveDraft(session: SensorSession): Promise<void> {
  await set(DRAFT_KEY, session);
}

export async function loadDraft(): Promise<SensorSession | undefined> {
  return get<SensorSession>(DRAFT_KEY);
}

export async function clearDraft(): Promise<void> {
  await del(DRAFT_KEY);
}

export async function loadQueue(): Promise<QueuedSensor[]> {
  return (await get<QueuedSensor[]>(QUEUE_KEY)) ?? [];
}

export async function addToQueue(session: SensorSession): Promise<void> {
  const queue = await loadQueue();
  const entry: QueuedSensor = {
    queueId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    session,
  };
  await set(QUEUE_KEY, [...queue, entry]);
}

export async function removeFromQueue(queueId: string): Promise<void> {
  const queue = await loadQueue();
  await set(
    QUEUE_KEY,
    queue.filter((q) => q.queueId !== queueId),
  );
}

export async function clearQueue(): Promise<void> {
  await del(QUEUE_KEY);
}
