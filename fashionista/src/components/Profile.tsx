import { auth } from '../lib/firebase'
import { useEffect, useState } from 'react'

function Profile() {
  const user = auth.currentUser;
  const [looksCount, setLooksCount] = useState<number | null>(null);

  

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


