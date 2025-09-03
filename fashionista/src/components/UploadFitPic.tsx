import { useRef, useState } from 'react';
import { MdImage } from 'react-icons/md';

interface Props {
  fitImg: File | null;
  setFitImg: (file: File | null) => void;
  onTryOn: () => void;
  userImgs?: File[];
}

export default function UploadFitPic({ fitImg, setFitImg, onTryOn, userImgs }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState('');

  const handleUpload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(
        `http://localhost:5000/fetch-image?url=${encodeURIComponent(imageUrl)}`
      );
      if (!response.ok) throw new Error("Failed to fetch image from backend");

      const blob = await response.blob();
      const filename = imageUrl.split("/").pop() || "fit.png";
      const file = new File([blob], filename, { type: blob.type });
      setFitImg(file);
    } catch (err) {
      if (err instanceof Error) alert(err.message);
      else alert("Unknown error");
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) alert("File size exceeds 10MB");
    else setFitImg(file);
  };


  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      return;
    }

    let url = '';
    const uriItem = Array.from(e.dataTransfer.items).find(item => item.type === 'text/uri-list');
    if (uriItem) {
      url = await new Promise<string>(resolve => {
        uriItem.getAsString(resolve);
      });
    } else {
      const htmlItem = Array.from(e.dataTransfer.items).find(item => item.type === 'text/html');
      if (htmlItem) {
        const html = await new Promise<string>(resolve => {
          htmlItem.getAsString(resolve);
        });
        const match = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        if (match && match[1]) url = match[1];
      }
    }

    if (url) {
      try {
        // backend proxy to avoid CORS issues
        const response = await fetch(
          `http://localhost:5000/fetch-image?url=${encodeURIComponent(url)}`
        );
        if (!response.ok) throw new Error('Failed to fetch dropped image');
        const blob = await response.blob();
        const filename = url.split('/').pop()?.split('?')[0] || 'fit.png';
        const file = new File([blob], filename, { type: blob.type });
        setFitImg(file);
      } catch (err) {
        if (err instanceof Error) alert(err.message);
        else alert('Unknown error');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex flex-col items-center mt-4">
      <h3 className="text-black text-[18px] font-[380] text-center w-[212px] h-[31px]">
        Select the fit to Try On
      </h3>

      <div className="relative mt-4 w-[300px]">
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL"
          className="h-[38px] w-full rounded-full border-1 bg-card/10 backdrop-blur-sm border-fashion-accent/20 px-4 pr-[90px] text-white-700"
        />
        <button
          className="absolute right-0 top-0 flex h-[36.5px] w-[80px] items-center justify-center"
          style={{
            borderRadius: '1000px',
            background: 'linear-gradient(90deg, #000000 0%, #000000 100%)',
            color: 'white',
          }}
          onClick={handleUpload}
        >
          Upload
        </button>
      </div>

      <div
        className="w-[300px] h-[314px] bg-card/10 backdrop-blur-sm border-fashion-accent/20 rounded-[25px] flex flex-col items-center justify-center mt-4 cursor-pointer relative overflow-hidden border-1 border-gray-200"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
      >
        {!fitImg && (
          <div className="flex flex-col items-center pointer-events-none">
            <MdImage size={48} className="text-gray-700 mb-3" />
            <p className="text-[#404040] font-[510] text-[17px] text-center w-[190px] h-[62px]">
              Drag & drop the fit image here
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {fitImg && (
          <img
            src={URL.createObjectURL(fitImg)}
            alt="Fit Upload"
            className="absolute top-1 left-0 w-[350px] h-[300px] object-contain pointer-events-none"
          />
        )}
      </div>
      <button
    className="mt-8 h-[48px] w-[188px] bg-gradient-to-r from-[#000000] to-[#000000] text-white font-semibold text-[16px]"
    style={{ borderRadius: '8rem' }}
    onClick={onTryOn}
    disabled={!fitImg || (userImgs?.length ?? 0) === 0} 
  >
    
    Try On
  </button>
    </div>
  );
}
