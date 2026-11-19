import type { LanguageCode } from '../shared/voices';

export interface DialogueTurn {
  id: string;
  speaker: 'A' | 'B';
  text: string;
}

export interface StudioTake {
  id: string;
  title: string;
  mode: 'single' | 'dialogue';
  language?: LanguageCode;
  scriptText: string;
  dialogueLines?: Array<{ speaker: 'A' | 'B'; text: string }>;
  voiceId: string;
  voiceLabel: string;
  secondaryVoiceId?: string;
  toneId: string;
  pitch?: number;
  speakingSpeed?: number;
  customDirection: string;
  durationSec: number;
  byteLength: number;
  createdAt: number;
  audioBlob: Blob;
}

const DB_NAME = 'cadence_studio_db';
const STORE_NAME = 'takes';
const DB_VERSION = 1;

let memoryFallback: StudioTake[] = [];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open error'));
  });
}

export async function loadAllTakes(): Promise<StudioTake[]> {
  try {
    const db = await openDatabase();
    return await new Promise<StudioTake[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as StudioTake[]) || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [...memoryFallback].sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function saveTake(take: StudioTake): Promise<void> {
  memoryFallback = [take, ...memoryFallback.filter((t) => t.id !== take.id)];
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(take);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Keep memoryFallback silently when IndexedDB is restricted
  }
}

export async function updateTakeTitle(id: string, title: string): Promise<void> {
  memoryFallback = memoryFallback.map((t) => (t.id === id ? { ...t, title } : t));
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as StudioTake | undefined;
        if (existing) {
          store.put({ ...existing, title });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback already updated
  }
}

export async function deleteTakeById(id: string): Promise<void> {
  memoryFallback = memoryFallback.filter((t) => t.id !== id);
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback already updated
  }
}
