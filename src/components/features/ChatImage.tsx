import React from 'react';
import { Download, Sparkles } from 'lucide-react'; // Or your local icons
import { downloadImage } from '../../lib/image-gen';
import ImageWatermark from './ImageWatermark';

interface ChatImageProps {
  url: string;
  prompt: string;
}

const ChatImage: React.FC<ChatImageProps> = ({ url, prompt }) => {
  return (
    <div className="my-4 max-w-[320px] sm:max-w-[400px] animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        
        {/* The Image */}
        <div className="relative aspect-square w-full overflow-hidden">
          <img 
            src={url} 
            alt={prompt}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Your Custom Watermark Component */}
          <div className="absolute inset-0 pointer-events-none">
            <ImageWatermark text="DANI AI" />
          </div>

          {/* Download Button - visible on hover */}
          <button 
            onClick={() => downloadImage(url, prompt)}
            className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-cyan-500"
          >
            <Download size={18} />
          </button>
        </div>

        {/* Caption Bar */}
        <div className="flex items-center justify-between bg-black/40 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <Sparkles size={14} className="text-cyan-400 shrink-0" />
            <p className="truncate text-[11px] italic text-zinc-300">
              {prompt}
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-bold tracking-tighter text-zinc-500">
            REALISTIC-V1
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatImage;
