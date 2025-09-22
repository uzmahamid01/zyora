// App.tsx
import { useEffect, useState } from "react";
import UploadYourPic from "./components/UploadYourPic";
import UploadFitPic from "./components/UploadFitPic";
import GenerateLook from "./components/GenerateLook";
import SignIn from "./components/SignIn";
import { signInWithChrome } from "./lib/chromeAuth";
import { onAuthChanged } from "./lib/firebase";
import UserInfo from "./components/UserInfo";
import {db, auth } from "./lib/firebase";
import Profile from "./components/Profile";
import History from "./components/History";
import { doc, onSnapshot } from "firebase/firestore";

export default function App() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [userImgs, setUserImgs] = useState<File[]>([]);
  const [fitImg, setFitImg] = useState<File | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [looksCount, setLooksCount] = useState<number>(0);


  useEffect(() => {
  if (!auth.currentUser) return;

  const userRef = doc(db, "users", auth.currentUser.uid);
  const unsub = onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const count = snap.data().generatedCount || 0;
      setLooksCount(count);
      if (auth.currentUser) {
        localStorage.setItem(`zyora:looks:count:${auth.currentUser.uid}`, String(count));
      }
    }
  });

  return () => unsub();
}, [auth.currentUser]);

  
  useEffect(() => {
    const unsub = onAuthChanged((user: any) => {
      setSignedIn(!!user);
    });
    return () => unsub();
  }, []);


  return (
    <div
      className="min-h-screen min-w-screen bg-cover bg-center relative"
      style={{ backgroundImage: "url('/i1.avif')" }}
    >
      {!signedIn ? (
        <SignIn
          onSignIn={() =>
            signInWithChrome(true).catch((e) => console.error(e))
          }
        />
      ) : (
        <div className="flex flex-col items-center w-full relative">
          <div className="absolute top-4 right-6 flex items-center gap-4">
            <div className="relative">
              <div 
                  className="absolute -top-2 -right-2 text-black rounded-full w-6 h-6 flex items-center justify-center animate-pulse cursor-help"
                  title={`${7-looksCount} of 7 free look generations left`}
                >
                {looksCount}/7
              </div>
            </div>
            <div>
              <UserInfo />
            </div>
          </div>

          <h2 className="text-center font-bold py-4 text-3xl md:text-4xl text-[#404040] mb-0">
            ZYORA <br />
            <span className="font-normal text-lg md:text-xl text-[#404040]">
              Style . Simplified . Virtually
            </span>
          </h2>

          <hr className="border-t border-[#eee] w-full justify-self-center mb-1" />
          
          <div className="flex w-full">
            <button
              className={`w-1/2 backdrop-blur-sm px-4 text-black hover:bg-white/10 border-r border-white/20 cursor-pointer py-3 transition-all ${
                !showHistory ? 'shadow-lg shadow-black/20' : ''
              }`}
              style={{ background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.2)', borderRadius: 0, outline: 'none' }}
              onClick={() => {
                setShowGenerate(false);
                setShowProfile(false);
                setShowHistory(false);
              }}
            >
              Upload New
            </button>

            <button
              className={`w-1/2 backdrop-blur-sm text-black hover:bg-white/10 cursor-pointer py-3 transition-all ${
                showHistory ? 'shadow-lg shadow-black/20' : ''
              }`}
              style={{ background: 'transparent', border: 'none', borderRadius: 0, outline: 'none' }}
              onClick={() => setShowHistory(true)}
            >
              Saved Looks
            </button>
            
            
            
          </div>

          <hr className="border-t border-[#eee] w-full justify-self-center mb-1" />

          <div className="flex items-center h-full w-full justify-center">
            {showProfile ? (
              <div className="w-full max-w-3xl">
                <Profile />
              </div>
            ) : showHistory ? (
              <div className="w-full max-w-3xl">
                <History onBack={() => setShowHistory(false)} />
              </div>
            ) : !showGenerate ? (
              <div className="flex flex-col items-center w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                <UploadYourPic userImgs={userImgs} setUserImgs={setUserImgs} />
                <UploadFitPic
                  fitImg={fitImg}
                  setFitImg={setFitImg}
                  onTryOn={() => setShowGenerate(true)}
                  userImgs={userImgs}
                  looksCount={looksCount}
                />
              </div>
            ) : (
              <div className="flex w-full h-full items-center justify-center">
                  <GenerateLook
                  userImgs={userImgs}
                  fitImg={fitImg}
                  onBack={() => setShowGenerate(false)}
                  onGenerated={() => {
                    // generated count is handled in GenerateLook.tsx
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
