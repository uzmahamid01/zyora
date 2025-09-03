import { useState } from "react";
import UploadYourPic from "./components/UploadYourPic";
import UploadFitPic from "./components/UploadFitPic";
import GenerateLook from "./components/GenerateLook";

export default function App() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [userImgs, setUserImgs] = useState<File[]>([]);
  const [fitImg, setFitImg] = useState<File | null>(null);

  return (
    <>
      <div className="min-h-screen min-w-screen bg-cover bg-center"
  style={{ backgroundImage: "url('/i1.avif')" }}>
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
              <UploadFitPic fitImg={fitImg} setFitImg={setFitImg} onTryOn={() => setShowGenerate(true)} userImgs={userImgs} />
            </div>
          ) : (
            <div className="flex w-full h-full items-center justify-center">
              <GenerateLook userImgs={userImgs} fitImg={fitImg} onBack={() => setShowGenerate(false)} />
              {!userImgs.length && !fitImg && (
                // disable try on button in UploadFitPic
                <button disabled id="try-on-button">
                  Try On
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

