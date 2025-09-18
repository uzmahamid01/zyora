import { auth, db } from './firebase';
import { doc, getDoc, setDoc, increment, onSnapshot } from 'firebase/firestore';

export interface UserCounts {
  generatedCount: number;
  savedCount: number;
  lastUpdated: Date;
}

/**
 * Centralized count management system that syncs across all devices
 * Falls back to localStorage when Firebase is unavailable
 */
export class CountManager {
  private static instance: CountManager;
  private listeners: Map<string, () => void> = new Map();

  static getInstance(): CountManager {
    if (!CountManager.instance) {
      CountManager.instance = new CountManager();
    }
    return CountManager.instance;
  }

  /**
   * Get the current user's counts from Firestore
   */
  async getCounts(): Promise<UserCounts> {
    if (!auth.currentUser) {
      return this.getLocalCounts();
    }

    try {
      const countsRef = doc(db, 'users', auth.currentUser.uid, 'meta', 'counts');
      const countsSnap = await getDoc(countsRef);
      
      if (countsSnap.exists()) {
        const data = countsSnap.data();
        return {
          generatedCount: data.generatedCount || 0,
          savedCount: data.savedCount || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        };
      } else {
        // Initialize with current localStorage values
        const localCounts = this.getLocalCounts();
        await this.setCounts(localCounts);
        return localCounts;
      }
    } catch (error) {
      console.warn('Failed to get counts from Firestore, using localStorage:', error);
      return this.getLocalCounts();
    }
  }

  /**
   * Set the user's counts in Firestore
   */
  async setCounts(counts: Partial<UserCounts>): Promise<void> {
    if (!auth.currentUser) {
      this.setLocalCounts(counts);
      return;
    }

    try {
      const countsRef = doc(db, 'users', auth.currentUser.uid, 'meta', 'counts');
      await setDoc(countsRef, {
        ...counts,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (error) {
      console.warn('Failed to set counts in Firestore, using localStorage:', error);
      this.setLocalCounts(counts);
    }
  }

  /**
   * Increment a specific count
   */
  async incrementCount(type: 'generatedCount' | 'savedCount', amount: number = 1): Promise<void> {
    if (!auth.currentUser) {
      this.incrementLocalCount(type, amount);
      return;
    }

    try {
      const countsRef = doc(db, 'users', auth.currentUser.uid, 'meta', 'counts');
      await setDoc(countsRef, {
        [type]: increment(amount),
        lastUpdated: new Date()
      }, { merge: true });
    } catch (error) {
      console.warn('Failed to increment count in Firestore, using localStorage:', error);
      this.incrementLocalCount(type, amount);
    }
  }

  /**
   * Listen to count changes in real-time
   */
  subscribeToCounts(callback: (counts: UserCounts) => void): () => void {
    if (!auth.currentUser) {
      // Fallback to localStorage polling
      const interval = setInterval(() => {
        callback(this.getLocalCounts());
      }, 1000);
      return () => clearInterval(interval);
    }

    try {
      const countsRef = doc(db, 'users', auth.currentUser.uid, 'meta', 'counts');
      const unsubscribe = onSnapshot(countsRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            generatedCount: data.generatedCount || 0,
            savedCount: data.savedCount || 0,
            lastUpdated: data.lastUpdated?.toDate() || new Date()
          });
        } else {
          callback(this.getLocalCounts());
        }
      }, (error) => {
        console.warn('Firestore subscription failed, using localStorage:', error);
        callback(this.getLocalCounts());
      });

      return unsubscribe;
    } catch (error) {
      console.warn('Failed to subscribe to counts, using localStorage:', error);
      const interval = setInterval(() => {
        callback(this.getLocalCounts());
      }, 1000);
      return () => clearInterval(interval);
    }
  }

  /**
   * Get counts from localStorage (fallback)
   */
  private getLocalCounts(): UserCounts {
    const uid = auth.currentUser?.uid || 'anonymous';
    const generatedKey = `zyora:generated:count:${uid}`;
    const savedKey = `zyora:saved:count:${uid}`;
    
    return {
      generatedCount: parseInt(localStorage.getItem(generatedKey) || '0', 10),
      savedCount: parseInt(localStorage.getItem(savedKey) || '0', 10),
      lastUpdated: new Date()
    };
  }

  /**
   * Set counts in localStorage (fallback)
   */
  private setLocalCounts(counts: Partial<UserCounts>): void {
    const uid = auth.currentUser?.uid || 'anonymous';
    
    if (counts.generatedCount !== undefined) {
      localStorage.setItem(`zyora:generated:count:${uid}`, String(counts.generatedCount));
    }
    if (counts.savedCount !== undefined) {
      localStorage.setItem(`zyora:saved:count:${uid}`, String(counts.savedCount));
    }
  }

  /**
   * Increment count in localStorage (fallback)
   */
  private incrementLocalCount(type: 'generatedCount' | 'savedCount', amount: number): void {
    const uid = auth.currentUser?.uid || 'anonymous';
    const key = type === 'generatedCount' ? `zyora:generated:count:${uid}` : `zyora:saved:count:${uid}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + amount));
  }

  /**
   * Sync localStorage counts to Firestore (migration)
   */
  async syncLocalToFirestore(): Promise<void> {
    if (!auth.currentUser) return;

    try {
      const localCounts = this.getLocalCounts();
      await this.setCounts(localCounts);
      console.log('Synced local counts to Firestore:', localCounts);
    } catch (error) {
      console.warn('Failed to sync local counts to Firestore:', error);
    }
  }
}

export const countManager = CountManager.getInstance();
