import { auth } from '../lib/firebase'
import { useEffect, useState } from 'react'

function Profile() {
  const user = auth.currentUser;
  const [looksCount, setLooksCount] = useState<number | null>(null);
  const [profileThumb, setProfileThumb] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const key = `zyora:looks:${user?.uid || user?.email || 'anon'}`;
        const count = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        setLooksCount(count);
      } catch (e) {
        console.warn('Failed to read looks count', e);
        setLooksCount(null);
      }

      try {
        const BACKEND_URL = import.meta.env.PLASMO_PUBLIC_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const idToken = await (window as any).__auth_getIdToken?.();
        const headers: Record<string, string> = {};
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
        const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/profile-photos?uid=${encodeURIComponent(user?.uid || user?.email || 'anon')}`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.items && Array.isArray(json.items) && json.items.length > 0) {
            setProfileThumb(json.items[0].thumbnail || json.items[0].image || null);
            return;
          }
        }
      } catch (e) {
        // fallback to localStorage
      }

      try {
        const key = `zyora:profile:${user?.uid || user?.email || 'anon'}`;
        const stored = JSON.parse(localStorage.getItem(key) || 'null');
        if (stored && stored.thumb) setProfileThumb(stored.thumb);
      } catch (e) {}
    };
    load();
  }, [user?.uid, user?.email]);

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


