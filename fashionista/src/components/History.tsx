import { useEffect, useState } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from '../components/hooks/use-toast';

interface HistoryEntry {
  id: string;
  image: string;
  createdAt?: Date;
}

export default function History({ }: { onBack?: () => void }) {
  const user = auth.currentUser;
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if Firebase is properly configured
    const storageBucket = import.meta.env.PLASMO_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                         import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    
    // More comprehensive check for Firebase configuration
    const isFirebaseConfigured = storageBucket && 
                                 !storageBucket.includes('__FIREBASE_') && 
                                 !storageBucket.includes('undefined') &&
                                 (storageBucket.includes('.appspot.com') || storageBucket.includes('.firebasestorage.app'));
    
    if (!isFirebaseConfigured) {
      // Fallback to localStorage
      setUseLocalStorage(true);
      loadFromLocalStorage();
      return;
    }

    // Use Firebase Firestore
    try {
      const q = query(collection(db, 'users', user.uid, 'looks'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setEntries(data);
      }, (error) => {
        console.warn('Firestore query failed, falling back to localStorage:', error);
        setUseLocalStorage(true);
        loadFromLocalStorage();
      });
      return () => unsub();
    } catch (error) {
      console.warn('Firestore setup failed, falling back to localStorage:', error);
      setUseLocalStorage(true);
      loadFromLocalStorage();
    }
  }, [user]);

  const loadFromLocalStorage = () => {
    if (!user) return;
    
    const localStorageEntries: HistoryEntry[] = [];
    
    // Get all localStorage keys for this user's looks
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`zyora:looks:${user.uid}:`)) {
        const imageData = localStorage.getItem(key);
        if (imageData) {
          const timestamp = key.split(':').pop();
          localStorageEntries.push({
            id: key,
            image: imageData,
            createdAt: new Date(parseInt(timestamp || '0'))
          });
        }
      }
    }
    
    // Sort by timestamp (newest first)
    localStorageEntries.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    setEntries(localStorageEntries);
    
    console.log(`Loaded ${localStorageEntries.length} images from localStorage`);
  };

  // Resolve storage paths to download URLs when necessary
  useEffect(() => {
    (async () => {
      if (!entries || entries.length === 0) return;
      const next: Record<string, string> = { ...resolved };
      let changed = false;

      for (const e of entries) {
        const cur = next[e.id];
        if (cur) continue;

        const img = e.image;
        
        // If using localStorage, images are already base64 data URLs
        if (useLocalStorage) {
          next[e.id] = img;
          changed = true;
          continue;
        }
        
        // If image is already a http(s) URL, use it directly
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
          next[e.id] = img;
          changed = true;
          continue;
        }

        try {
          // Treat value as a storage path (like "looks/{uid}/...png")
          const ref = storageRef(storage, img);
          const url = await getDownloadURL(ref);
          next[e.id] = url;
          changed = true;
        } catch (err) {
          console.warn('Failed to resolve storage URL for', e.id, err);
          // Fallback to the original value
          next[e.id] = img;
          changed = true;
        }
      }

      if (changed) setResolved(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, useLocalStorage]);

  const download = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'look.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const remove = async (id: string) => {
    if (!user) return;
    try {
      if (useLocalStorage) {
        // Remove from localStorage
        localStorage.removeItem(id);
        // Reload from localStorage
        loadFromLocalStorage();
        toast({ title: 'Deleted', description: 'Look removed successfully' });
      } else {
        // Attempt to delete the associated storage object first
        try {
          const entry = entries.find((en) => en.id === id);
          if (entry && entry.image) {
            const img = entry.image;
            let refToDelete: ReturnType<typeof storageRef> | null = null;

            if (typeof img === 'string') {
              if (img.startsWith('gs://')) {
                // gs://bucket/path -> remove prefix to get path
                const withoutGS = img.replace(/^gs:\/\/[A-Za-z0-9.\-]+\//, '');
                refToDelete = storageRef(storage, withoutGS);
              } else if (img.startsWith('http://') || img.startsWith('https://')) {
                try {
                  const url = new URL(img);
                  const parts = url.pathname.split('/o/');
                  if (parts.length > 1) {
                    const objectPath = decodeURIComponent(parts[1].split('?')[0]);
                    refToDelete = storageRef(storage, objectPath);
                  }
                } catch (e) {
                  // ignore parse errors
                }
              } else {
                // Treat as a storage path already
                refToDelete = storageRef(storage, img);
              }
            }

            if (refToDelete) {
              try {
                await deleteObject(refToDelete);
              } catch (err) {
                console.warn('Failed to delete storage object for', id, err);
              }
            }
          }
        } catch (err) {
          console.warn('Error while attempting storage deletion', err);
        }

        // Remove Firestore document
        await deleteDoc(doc(db, 'users', user.uid, 'looks', id));
        toast({ title: 'Deleted', description: 'Look removed successfully' });
      }
      
      // savedCount is local-only; do not update centralized generatedCount
    } catch (e) {
      console.error('Failed to delete', e);
      toast({ title: 'Error', description: 'Failed to delete look' });
    }
  };

  return (
    <div className="p-4">
      {entries.length === 0 ? (
        <div className="text-sm text-gray-600">No saved looks yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {entries.map((e) => (
            <div key={e.id} className="bg-white/80 p-2 rounded shadow">
              <img src={resolved[e.id] || e.image} alt={`look-${e.id}`} className="w-full h-100 object-cover rounded" />

              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  <Button onClick={() => download(resolved[e.id] || e.image)} className="p-2">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => remove(e.id)} variant="outline" className="p-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
