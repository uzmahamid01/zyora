import { useState, useEffect } from "react";
import UploadYourPic from "./components/UploadYourPic";
import UploadFitPic from "./components/UploadFitPic";
import GenerateLook from "./components/GenerateLook";
import SignIn from "./components/SignIn";

interface User {
  email?: string;
  [key: string]: any;
}

export default function App() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [userImgs, setUserImgs] = useState<File[]>([]);
  const [fitImg, setFitImg] = useState<File | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load user from Chrome storage on mount
  useEffect(() => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(["user"], (res) => {
        if (res.user) setUser(res.user);
      });
    }
  }, []);

  const handleSignIn = () => {
    chrome.runtime.sendMessage({ action: "signIn" }, (response) => {
      if (response?.user) {
        chrome.storage.local.set({ user: response.user }, () => {
          setUser(response.user);
        });
      }
    });
  };

  const handleSignOut = () => {
    chrome.runtime.sendMessage({ action: "signOut" }, () => {
      chrome.storage.local.remove("user", () => {
        setUser(null);
      });
    });
  };

  if (!user) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <div
      className="min-h-screen min-w-screen bg-cover bg-center relative"
      style={{ backgroundImage: "url('/i1.avif')" }}
    >
      {/* Top bar with avatar */}
      <div className="absolute top-4 right-4">
        <div className="relative">
          <img
            src="https://ui-avatars.com/api/?name=User"
            alt="User Avatar"
            className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-300"
            onClick={() => setDropdownOpen((prev) => !prev)}
          />
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-lg py-2 z-50">
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-center font-bold py-4 text-3xl md:text-4xl text-[#404040] mb-0">
        ZYORA <br />
        <span className="font-normal text-lg md:text-xl text-[#404040]">
          Style . Simplified . Virtually
        </span>
      </h2>

      <hr className="border-t border-[#eee] w-full justify-self-center mb-6" />
      <div className="flex items-center h-full w-full justify-center ">
        {!showGenerate ? (
          <div className="flex flex-col items-center w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
            <UploadYourPic userImgs={userImgs} setUserImgs={setUserImgs} />
            <UploadFitPic
              fitImg={fitImg}
              setFitImg={setFitImg}
              onTryOn={() => setShowGenerate(true)}
              userImgs={userImgs}
            />
          </div>
        ) : (
          <div className="flex w-full h-full items-center justify-center">
            <GenerateLook
              userImgs={userImgs}
              fitImg={fitImg}
              onBack={() => setShowGenerate(false)}
            />
            {!userImgs.length && !fitImg && (
              <button disabled id="try-on-button">
                Try On
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
