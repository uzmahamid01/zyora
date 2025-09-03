// src/components/GenerateLook.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, Share2, Loader2 } from 'lucide-react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GenerateLookProps {
  userImgs: File[];
  fitImg: File | null;
  onBack: () => void;
}


const GenerateLook = ({ userImgs, fitImg, onBack }: GenerateLookProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [userImgIdx, setUserImgIdx] = useState(0);

  const handleGenerate = async () => {
  const formData = new FormData();
  userImgs.forEach(imgObj => formData.append("userImgs", imgObj));
  if (fitImg) {
    formData.append("fitImg", fitImg);
  }

  setIsGenerating(true);
  try {
    const res = await fetch("http://localhost:5000/generate-look", { method: "POST", body: formData });
    const data = await res.json();
    setGeneratedImage(`http://localhost:5000${data.url}`);
  } catch {
    alert("Failed to generate look");
  } finally {
    setIsGenerating(false);
  }
};


  const hasMultipleUserImgs = userImgs.length > 1;
  const currentUserImg = userImgs[userImgIdx] ?? null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <Button 
          onClick={onBack}
          variant="outline"
            className="mb-6 bg-gradient-to-r from-[#000000] to-[#000000] text-white hover:bg-gradient-to-r hover:from-[#222] hover:to-[#222] hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Upload
        </Button>

        <Card className="p-8 bg-card/10 backdrop-blur-sm border-fashion-accent/20">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-medium text-black">Your Virtual Try-On</h2>
            
            {!generatedImage && !isGenerating && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="space-y-2">
                    <p className="text-sm text-fashion-accent">Your Photo</p>
                    <div className="aspect-square bg-fashion-accent/10 rounded-lg flex items-center justify-center border border-fashion-accent/20 relative">
                      {currentUserImg ? (
                        <>
                          <img
                            src={URL.createObjectURL(currentUserImg)}
                            alt={`Your photo ${userImgIdx + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {hasMultipleUserImgs && (
                            <>
                              <button
                                className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-1"
                                style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', fontWeight: 'bolder' }}
                                onClick={e => {
                                  e.stopPropagation();
                                  setUserImgIdx(idx => (idx - 1 + userImgs.length) % userImgs.length);
                                }}
                                aria-label="Previous image"
                              >
                                <ChevronLeft className="w-5 h-5 text-white" strokeWidth={3} />
                              </button>
                              <button
                                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-1"
                                style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', fontWeight: 'bolder' }}
                                onClick={e => {
                                  e.stopPropagation();
                                  setUserImgIdx(idx => (idx + 1) % userImgs.length);
                                }}
                                aria-label="Next image"
                              >
                                <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
                              </button>
                              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                                {userImgIdx + 1} / {userImgs.length}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-fashion-accent/60">No image</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-fashion-accent">Outfit</p>
                    <div className="aspect-square bg-fashion-accent/10 rounded-lg flex items-center justify-center border border-fashion-accent/20">
                      {fitImg ? (
                        <img 
                          src={URL.createObjectURL(fitImg)} 
                          alt="Outfit" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-fashion-accent/60">No image</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={userImgs.length === 0 || !fitImg}
                  className="bg-gradient-to-r from-[#000000] to-[#000000] text-white font-medium px-8 py-3"
                >
                  Generate Your Look
                </Button>
              </div>
            )}

            {isGenerating && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-fashion-accent" />
                </div>
                <p className="text-fashion-accent">Generating your look...</p>
              </div>
            )}

            {generatedImage && (
              <div className="space-y-6">
                <div className="max-w-md mx-auto">
                  <img 
                    src={generatedImage} 
                    alt="Generated look" 
                    className="w-full rounded-lg border border-fashion-accent/20"
                  />
                </div>
                
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline"
                    className="bg-gradient-to-r from-[#000000] to-[#000000] text-white"
                  >
                    <Download className="w-4 h-4 mr-2 text-white" />
                    Download
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-gradient-to-r from-[#000000] to-[#000000] text-white"
                  >
                    <Share2 className="w-4 h-4 mr-2 text-white" />
                    Share
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateLook;
