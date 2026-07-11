import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { AttendanceRecord, CashAdvance } from './types';

// Load configuration from the auto-provisioned file
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific databaseId provisioned for this applet
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface TrackerData {
  attendance: AttendanceRecord;
  baseSalary: number;
  freeAbsentsPerMonth: number;
  cashAdvances?: CashAdvance[];
  updatedAt?: any;
}

// Generates a clean, readable sync code (e.g., MP-9284-AX)
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `MP-${part1}-${part2}`;
}

// Saves/updates tracker data to Firestore
export async function saveTrackerData(syncCode: string, data: Partial<TrackerData>) {
  if (!syncCode) return;
  const docRef = doc(db, 'trackers', syncCode.toUpperCase().trim());
  try {
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving tracker data to Firestore:', error);
  }
}

// Subscribes to real-time updates for a sync code
export function subscribeToTracker(syncCode: string, onUpdate: (data: TrackerData | null) => void) {
  if (!syncCode) return () => {};
  const docRef = doc(db, 'trackers', syncCode.toUpperCase().trim());
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as TrackerData);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    console.error('Error listening to tracker data:', error);
  });
}

// Checks if a sync code exists
export async function checkSyncCodeExists(syncCode: string): Promise<boolean> {
  if (!syncCode) return false;
  const docRef = doc(db, 'trackers', syncCode.toUpperCase().trim());
  try {
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking sync code existence:', error);
    return false;
  }
}
