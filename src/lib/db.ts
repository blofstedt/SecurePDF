import { AnnotationItem } from "../types";

export interface AutoSaveSession {
  id: string;
  pdfBytes: ArrayBuffer;
  pdfFileName: string;
  currentPage: number;
  annotations: AnnotationItem[];
  savedSignatures: { id: string; dataUrl: string; name?: string }[];
  timestamp: number;
}

const DB_NAME = "SecurePDF_AutoSave_DB";
const STORE_NAME = "document_session";
const SESSION_KEY = "current_session";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAutoSaveSession(
  sessionData: Omit<AutoSaveSession, "id">
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record: AutoSaveSession = {
        id: SESSION_KEY,
        ...sessionData,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to auto-save to IndexedDB:", err);
  }
}

export async function loadAutoSaveSession(): Promise<AutoSaveSession | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SESSION_KEY);
      req.onsuccess = () => {
        resolve(req.result ? (req.result as AutoSaveSession) : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to load auto-save session from IndexedDB:", err);
    return null;
  }
}

export async function clearAutoSaveSession(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(SESSION_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to clear auto-save session in IndexedDB:", err);
  }
}
