import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { toast } from '../components/hooks/use-toast';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { doc, increment, setDoc } from "firebase/firestore";

interface GenerateLookProps {
  userImgs: File[];
  fitImg: File | null;
  onGenerated: () => void;
  onBack: () => void;
}

const GenerateLook = ({ userImgs, fitImg, onGenerated, onBack }: GenerateLookProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [userImgIdx, setUserImgIdx] = useState(0);

  // Compress image to reduce storage size
  const compressImage = (dataUrl: string, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 800px width/height)
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.src = dataUrl;
    });
  };

  // Save to localStorage with compression and cleanup
  const saveToLocalStorage = async () => {
    try {
      // Compress the image
      const compressedImage = await compressImage(generatedImage!, 0.6);
      
      const countKey = `zyora:looks:count:${auth.currentUser?.uid}`;
      const prev = parseInt(localStorage.getItem(countKey) || '0', 10) || 0;
      const newCount = prev + 1;
      
      // Clean up old images if we have more than 10
      if (newCount > 10) {
        await cleanupOldImages();
      }
      
      // Save the compressed image data
      const imageKey = `zyora:looks:${auth.currentUser?.uid}:${Date.now()}`;
      
      try {
        localStorage.setItem(imageKey, compressedImage);
        localStorage.setItem(countKey, String(newCount));
        
        // Update centralized count
        // saved looks are local-only; do not update centralized generatedCount
        
        toast({ title: 'Saved locally', description: 'Look saved to browser storage!' });
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          // If still too large, try with more compression
          const highlyCompressedImage = await compressImage(generatedImage!, 0.3);
          localStorage.setItem(imageKey, highlyCompressedImage);
          localStorage.setItem(countKey, String(newCount));
          
          // Update centralized count
          // saved looks are local-only; do not update centralized generatedCount
          
          toast({ title: 'Saved locally (compressed)', description: 'Look saved with high compression!' });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      toast({ title: 'Storage full', description: 'Unable to save locally. Please try again later.' });
    }
  };

  // Clean up old images to free space
  const cleanupOldImages = async () => {
    if (!auth.currentUser) return;
    
    const userKey = `zyora:looks:${auth.currentUser.uid}:`;
    const keysToRemove: string[] = [];
    
    // Find all keys for this user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userKey)) {
        keysToRemove.push(key);
      }
    }
    
    // Sort by timestamp (oldest first)
    keysToRemove.sort((a, b) => {
      const timestampA = parseInt(a.split(':').pop() || '0');
      const timestampB = parseInt(b.split(':').pop() || '0');
      return timestampA - timestampB;
    });
    
    // Remove oldest images (keep only the 5 most recent)
    const toRemove = keysToRemove.slice(0, Math.max(0, keysToRemove.length - 5));
    toRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`Cleaned up ${toRemove.length} old images`);
  };



  const handleGenerate = async () => {
    if (!fitImg || userImgs.length === 0) return;

    const formData = new FormData();
    userImgs.forEach((img) => formData.append("userImgs", img));
    formData.append("fitImg", fitImg);

    setIsGenerating(true);

    try {
      let res: Response;
      const res1 = await fetch("https://zyora-szo7.vercel.app/api/generate-look", { method: "POST", body: formData });
      const res2 = await fetch("http://localhost:5000/api/generate-look", { method: "POST", body: formData });
      
      if (res2.ok) {
        res = res2;
      } else {
        res = res1;
      }
      
      const data = await res.json();
      const fullDataUrl = `data:image/png;base64,${data.image}`;
      setGeneratedImage(fullDataUrl);

      //increment generatedCount in Firestore
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userRef, { generatedCount: increment(1) }, { merge: true });
      }

      onGenerated();

    } catch (e) {
      console.error("Failed to generate look", e);
      alert("Failed to generate look");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToHistory = async () => {
    if (!generatedImage) return toast({ title: 'No image', description: 'No image to save' });
    if (!auth.currentUser) return toast({ title: 'Not signed in', description: 'Sign in to save looks' });

    try {
      // Check if Firebase is properly configured by testing the storage bucket
      const storageBucket = import.meta.env.PLASMO_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                           import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
      
      // More comprehensive check for Firebase configuration
      const isFirebaseConfigured = storageBucket && 
                                   !storageBucket.includes('__FIREBASE_') && 
                                   !storageBucket.includes('undefined') &&
                                   (storageBucket.includes('.appspot.com') || storageBucket.includes('.firebasestorage.app'));
      
      console.log('Firebase configuration check:', {
        storageBucket,
        isFirebaseConfigured,
        hasAppspot: storageBucket?.includes('.appspot.com'),
        hasFirebaseStorage: storageBucket?.includes('.firebasestorage.app'),
        hasUndefined: storageBucket?.includes('undefined'),
        hasPlaceholder: storageBucket?.includes('__FIREBASE_')
      });
      
      if (!isFirebaseConfigured) {
        console.warn('Firebase Storage not properly configured, saving to localStorage instead');
        // Fallback: save to localStorage with compression
        await saveToLocalStorage();
        return;
      }

      // Convert data URL to blob
      const res = await fetch(generatedImage);
      const blob = await res.blob();

      const uid = auth.currentUser.uid;
      const filename = `looks/${uid}/${Date.now()}.png`;
      const ref = storageRef(storage, filename);

      // Upload the image bytes to Firebase Storage with retry logic
      let uploadSuccess = false;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await uploadBytes(ref, blob);
          uploadSuccess = true;
          break;
        } catch (error: any) {
          lastError = error;
          console.warn(`Upload attempt ${attempt} failed:`, error.message);
          
          // Check for specific errors that indicate Firebase is not properly configured
          if (error.message?.includes('404') || 
              error.message?.includes('CORS') || 
              error.message?.includes('permission-denied') ||
              error.message?.includes('storage/unknown')) {
            console.warn('Firebase Storage appears to be misconfigured, falling back to localStorage');
            // Force fallback to localStorage with compression
            await saveToLocalStorage();
            return;
          }
          
          if (attempt < 3) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!uploadSuccess) {
        throw lastError || new Error('Upload failed after 3 attempts');
      }

      const url = await getDownloadURL(ref);

      // Save metadata to Firestore with a small payload (URL + timestamp)
      const looksRef = collection(db, 'users', uid, 'looks');
      const docRef = await addDoc(looksRef, {
        image: url,
        createdAt: serverTimestamp(),
      });
      console.log('Saved doc ID:', docRef.id);

      toast({ title: 'Saved', description: 'Look saved successfully!' });
      
      // Update centralized count
        // saved looks are local-only; do not update centralized generatedCount
    } catch (e: any) {
      console.error('Failed to save look', e);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save look';
      if (e.message?.includes('CORS')) {
        errorMessage = 'CORS error: Please check Firebase Storage configuration';
      } else if (e.message?.includes('retry-limit-exceeded')) {
        errorMessage = 'Upload timeout: Please try again';
      } else if (e.message?.includes('permission-denied')) {
        errorMessage = 'Permission denied: Please sign in again';
      } else if (e.message?.includes('unauthenticated')) {
        errorMessage = 'Authentication required: Please sign in';
      }
      
      toast({ title: 'Error', description: errorMessage });
    }
  };
  

  const hasMultipleUserImgs = userImgs.length > 1;
  const currentUserImg = userImgs[userImgIdx] ?? null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* <Button onClick={onBack} variant="outline" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Upload
        </Button> */}

        <Card className="p-8 bg-card/10 backdrop-blur-sm border-fashion-accent/20">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-medium text-black">Your Try-On Look</h2>

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
                <Loader2 className="w-8 h-8 animate-spin text-fashion-accent mx-auto" />
                <p className="text-fashion-accent">Generating your look...</p>
              </div>
            )}

            {generatedImage && (
              <div className="space-y-6">
                <img src={generatedImage} alt="Generated look" className="w-full rounded-lg border border-fashion-accent/20" />

                <div className="flex gap-3 justify-center">
                  <Button onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImage;
                    link.download = `zyora-look-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}>
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>

                  <Button onClick={saveToHistory}>
                    
                     Save
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
