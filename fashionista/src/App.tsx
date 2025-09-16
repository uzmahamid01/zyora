// App.tsx
import { useEffect, useState } from "react";
import UploadYourPic from "./components/UploadYourPic";
import UploadFitPic from "./components/UploadFitPic";
import GenerateLook from "./components/GenerateLook";
import SignIn from "./components/SignIn";
import { signInWithChrome } from "./lib/chromeAuth";
import { onAuthChanged } from "./lib/firebase";
import UserInfo from "./components/UserInfo";
import { auth } from "./lib/firebase";
import Profile from "./components/Profile";
import History from "./components/History";

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
    const countKey = `zyora:looks:count:${auth.currentUser.uid || auth.currentUser.email}`;
    const count = parseInt(localStorage.getItem(countKey) || '0', 10) || 0;
    setLooksCount(count);
  }, [auth.currentUser]);

  
  useEffect(() => {
    const unsub = onAuthChanged((user) => {
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
              <div className="absolute -top-2 -right-4 text-black rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {looksCount}
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
                   
                    setLooksCount(prev => {
                      const newCount = prev + 1;
                      if (auth.currentUser) {
                        const countKey = `zyora:looks:count:${auth.currentUser.uid || auth.currentUser.email}`;
                        localStorage.setItem(countKey, String(newCount));
                      }
                      return newCount;
                    });
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
