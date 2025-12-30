import { auth, db } from '../lib/firebase'
import { useEffect, useState } from 'react'
import { DocumentSnapshot, onSnapshot, doc } from 'firebase/firestore'

function Profile() {
  const user = auth.currentUser;
  const [looksCount, setLooksCount] = useState<number | null>(null);


  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);

    const unsub = onSnapshot(userRef, (snap: DocumentSnapshot) => {
      if (snap.exists()) {
        const count = snap.data()?.generatedCount || 0;
        setLooksCount(count);
        if (auth.currentUser) {
          localStorage.setItem(`zyora:looks:count:${auth.currentUser.uid}`, String(count));
        }
      }
    });

    return () => unsub();
  }, [auth.currentUser]);
  

  return (
    <div >
      

      <div className="flex items-center mt-8 ml-8 gap-4">
        <div>
          <div className="font-semibold">{user?.displayName || 'Unknown'}</div>
          <div className="text-sm text-gray-600">{user?.email}</div>
          <div className="text-sm text-gray-700 mt-2">Looks generated: {looksCount ?? '—'}</div>
          {/* uploaded pic of yours - get it from UploadYourPic.tsx */}
        </div>
      </div>
    </div>
  )
}

export default Profile


