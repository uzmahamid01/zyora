import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { toast } from '../components/hooks/use-toast';

export default function History({ }: { onBack?: () => void }) {
  const user = auth.currentUser;
  const [entries, setEntries] = useState<{ id: string; image: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'looks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setEntries(data);
    });
    return () => unsub();
  }, [user]);

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
      await deleteDoc(doc(db, 'users', user.uid, 'looks', id));
      toast({ title: 'Deleted', description: 'Look removed successfully' });
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
              <img src={e.image} alt={`look-${e.id}`} className="w-full h-100 object-cover rounded" />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  <Button onClick={() => download(e.image)} className="p-2">
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
