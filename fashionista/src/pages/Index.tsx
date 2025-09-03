import { useState } from 'react';
import UploadYourPic from '../components/UploadYourPic';
import UploadFitPic from '../components/UploadFitPic';
import GenerateLook from '../components/GenerateLook';

const Index = () => {
  const [showGenerate, setShowGenerate] = useState(false);
  const [userImg, setUserImg] = useState<File | null>(null);
  const [fitImg, setFitImg] = useState<File | null>(null);

  return (
    <div className="h-screen w-full bg-fashion-gradient flex items-center justify-center overflow-hidden">
      {!showGenerate ? (
        <div className="flex flex-col items-center justify-center w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl px-4">
          <h1 className="text-3xl md:text-4xl font-medium text-fashion-muted mb-6 text-center">
            Fashionista
          </h1>
          <div className="w-full border-t border-fashion-accent/30 mb-8"></div>
          
          <div className="space-y-8 w-full flex flex-col items-center">
            <UploadYourPic userImg={userImg} setUserImg={setUserImg} />
            <UploadFitPic fitImg={fitImg} setFitImg={setFitImg} onTryOn={() => setShowGenerate(true)} />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <GenerateLook userImg={userImg} fitImg={fitImg} onBack={() => setShowGenerate(false)} />
        </div>
      )}
    </div>
  );
};

export default Index;