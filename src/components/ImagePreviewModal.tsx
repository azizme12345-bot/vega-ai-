import React from 'react';
import { X, Download } from 'lucide-react';
import { ChatImage } from '../types';

interface ImagePreviewModalProps {
  image: ChatImage | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-slate-900 p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <a
            href={image.previewUrl}
            download={image.name || 'image.jpg'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-white backdrop-blur-xs hover:bg-slate-700 transition"
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-white backdrop-blur-xs hover:bg-slate-700 transition"
            title="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <img
          src={image.previewUrl}
          alt={image.name || 'Full view'}
          className="max-h-[85vh] max-w-full rounded-xl object-contain"
        />

        <div className="p-2 text-center text-xs text-slate-400">
          <span>{image.name}</span>
          {image.sizeBytes && (
            <span className="ml-2">({Math.round(image.sizeBytes / 1024)} KB)</span>
          )}
        </div>
      </div>
    </div>
  );
};
