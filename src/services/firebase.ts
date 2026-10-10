import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { DatabaseSchema } from '../types';

export const firebaseConfig = {
  apiKey: 'AIzaSyDOJcdPiExQLtiXiWPOL49Y0heSo31TP0o',
  authDomain: 'perpustakaan-44881.firebaseapp.com',
  projectId: 'perpustakaan-44881',
  storageBucket: 'perpustakaan-44881.firebasestorage.app',
  messagingSenderId: '949030615093',
  appId: '1:949030615093:web:fe24267184fb05252f197c',
  measurementId: 'G-DVQGBBMY79',
};

let firestoreDb: Firestore | null = null;

try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firestoreDb = getFirestore(app);
} catch (e) {
  console.warn('Firebase initialization error:', e);
}

export const isFirebaseAvailable = (): boolean => Boolean(firestoreDb);

export async function saveItemToCloud(
  collectionName: string,
  docId: string,
  dataObject: Record<string, unknown>
): Promise<void> {
  if (!firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    await setDoc(docRef, dataObject, { merge: true });
  } catch (error) {
    console.warn(`Gagal menyimpan ke Firestore [${collectionName}]:`, error);
  }
}

export async function deleteItemFromCloud(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Gagal menghapus dari Firestore [${collectionName}]:`, error);
  }
}

export async function migrateAllToCloud(localDb: DatabaseSchema): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    if (localDb.Sekolah) {
      await setDoc(doc(firestoreDb, 'sekolah', 'profil'), localDb.Sekolah, { merge: true });
    }
    if (localDb.Pengaturan) {
      await setDoc(doc(firestoreDb, 'pengaturan', 'konfigurasi'), localDb.Pengaturan, { merge: true });
    }
    for (const s of localDb.Siswa || []) {
      await setDoc(doc(firestoreDb, 'siswa', String(s.id)), s, { merge: true });
    }
    for (const b of localDb.Buku || []) {
      await setDoc(doc(firestoreDb, 'buku', String(b.id)), b, { merge: true });
    }
    for (const eb of localDb.Ebook || []) {
      await setDoc(doc(firestoreDb, 'ebook', String(eb.id)), eb, { merge: true });
    }
    for (const p of localDb.Peminjaman || []) {
      await setDoc(doc(firestoreDb, 'peminjaman', String(p.id)), p, { merge: true });
    }
    for (const d of localDb.Denda || []) {
      await setDoc(doc(firestoreDb, 'denda', String(d.id)), d, { merge: true });
    }
    for (const a of localDb.Administrator || []) {
      await setDoc(doc(firestoreDb, 'administrator', String(a.id)), a, { merge: true });
    }
    return true;
  } catch (err) {
    console.error('Migrasi cloud gagal:', err);
    return false;
  }
}

let isSyncPaused = false;

export function setCloudSyncPaused(paused: boolean): void {
  isSyncPaused = paused;
}

export function isCloudSyncPaused(): boolean {
  return isSyncPaused;
}

export function subscribeToCloudChanges(
  onUpdate: (updater: (prevDb: DatabaseSchema) => DatabaseSchema) => void
): () => void {
  if (!firestoreDb) return () => {};

  const unsubs: (() => void)[] = [];
  const collections = ['siswa', 'buku', 'ebook', 'peminjaman', 'denda', 'administrator'] as const;

  collections.forEach((colName) => {
    try {
      const colRef = collection(firestoreDb!, colName);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (isSyncPaused) return;
          if (!snapshot.empty) {
            const items: Record<string, unknown>[] = [];
            snapshot.forEach((docItem) => {
              items.push({ id: docItem.id, ...docItem.data() });
            });
            const key = (colName.charAt(0).toUpperCase() + colName.slice(1)) as keyof DatabaseSchema;
            onUpdate((prev) => ({
              ...prev,
              [key]: items,
            }));
          }
        },
        (err) => {
          console.warn(`Firestore listener [${colName}] error:`, err);
        }
      );
      unsubs.push(unsub);
    } catch {
      // Ignore listener error
    }
  });

  // Profile Sekolah listener
  try {
    const unsubSekolah = onSnapshot(doc(firestoreDb, 'sekolah', 'profil'), (snap) => {
      if (isSyncPaused) return;
      if (snap.exists()) {
        const data = snap.data();
        onUpdate((prev) => ({
          ...prev,
          Sekolah: { ...prev.Sekolah, ...data },
        }));
      }
    });
    unsubs.push(unsubSekolah);
  } catch {
    // Ignore
  }

  // Pengaturan listener
  try {
    const unsubPengaturan = onSnapshot(doc(firestoreDb, 'pengaturan', 'konfigurasi'), (snap) => {
      if (isSyncPaused) return;
      if (snap.exists()) {
        const data = snap.data();
        onUpdate((prev) => ({
          ...prev,
          Pengaturan: { ...prev.Pengaturan, ...data },
        }));
      }
    });
    unsubs.push(unsubPengaturan);
  } catch {
    // Ignore
  }

  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch {
        // Ignore
      }
    });
  };
}
