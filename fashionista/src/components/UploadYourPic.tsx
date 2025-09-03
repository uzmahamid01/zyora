import { useRef } from 'react';
import { MdImage, MdClose } from 'react-icons/md';

interface Props {
  userImgs: File[];
  setUserImgs: (files: File[]) => void;
}


export default function UploadYourPic({ userImgs, setUserImgs }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    let newFiles: File[] = Array.from(files);
    newFiles = newFiles.filter(f => f.size <= 10 * 1024 * 1024);
    if (newFiles.length < files.length) {
      alert('Some files were larger than 10MB and were not added.');
    }
    // Only allow up to 4 images - need to change 
    const combined = [...userImgs, ...newFiles].slice(0, 4);
    if (combined.length > 4) {
      alert('You can only upload up to 4 images.');
    }
    setUserImgs(combined);
  };

  const handleDelete = (idx: number) => {
    setUserImgs(userImgs.filter((_, i) => i !== idx));
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col items-center ">
      {/* Heading */}
      {/* <h3 className="text-white text-[20px] font-[510] w-[188px] h-[31px] text-center">
        Upload Your Picture
      </h3> */}

      <div
        className="w-[300px] h-[100px] bg-card/10 backdrop-blur-sm border-fashion-accent/20 rounded-[20px] flex flex-col items-center justify-center mt-2 cursor-pointer relative overflow-hidden border-1 border-gray-200"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {userImgs.length === 0 ? (
          <div className="flex flex-col items-center">
            <MdImage size={25} className="text-gray-700 " />
            <p className="text-[#404040] font-[420] text-[15px] text-center w-[190px] h-[48px]">
              Drag & drop your photo or upload from device
            </p>
          </div>
        ) : (
          <div className="flex w-full h-full items-center px-2 gap-2 relative">
            {userImgs.map((img, idx) => (
              <div key={idx} className="relative flex items-center justify-center">
                <img
                  src={URL.createObjectURL(img)}
                  alt={`User Upload ${idx+1}`}
                  className="w-[70px] h-[70px] object-cover rounded-lg"
                />
                <button
                  className="absolute top-[-17px] right-[-22px] p-0 m-0"
                style={{ background: 'transparent', border: 'none', outline: 'none', zIndex: 2}}
                onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                  aria-label="Remove image"
                >
                  <MdClose size={20} className="text-red-600 font-bold" style={{ fontWeight: 'bold' }} />
                </button>
              </div>
            ))}
            {userImgs.length < 4 && (
              <button
                className="bg-green-500 text-black py-2 px-4 rounded font-semibold"
                  style={{ background: 'black', color: 'white', borderRadius: '8rem' }}
                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                Upload More
              </button>
            )}
          </div>
        )}

   
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          multiple
          onChange={e => handleFileChange(e.target.files)}
        />
      </div>
    </div>
  );
}
