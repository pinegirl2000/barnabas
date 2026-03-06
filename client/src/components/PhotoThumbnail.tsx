import { useState } from 'react';

interface PhotoThumbnailProps {
  thumbnail?: string | null;
  fullPhoto?: string | null;
  size?: string;
}

export default function PhotoThumbnail({ thumbnail, fullPhoto, size = 'w-7 h-7' }: PhotoThumbnailProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!thumbnail) return null;

  return (
    <>
      <img
        src={thumbnail}
        alt=""
        className={`${size} rounded-full object-cover border border-gray-200 shrink-0 cursor-pointer`}
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
          setLightboxUrl(fullPhoto || thumbnail);
        }}
      />
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={e => { e.stopPropagation(); setLightboxUrl(null); }}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-[90vw] max-h-[80vh] rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
