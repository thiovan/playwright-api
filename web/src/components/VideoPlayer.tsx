import React, { useState } from 'react';
import { Film, Download, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface VideoPlayerProps {
  url: string;
  filename?: string;
  title?: string;
}

export function VideoPlayer({ url, filename, title }: VideoPlayerProps) {
  const [error, setError] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-black/40 overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span>{title || 'Execution Screen Recording'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px]">{filename}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => window.open(url, '_blank')}
          >
            <Download className="w-3 h-3 mr-1" /> Download
          </Button>
        </div>
      </div>

      <div className="relative aspect-video flex items-center justify-center bg-black">
        {error ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm">Video playback not available or still finalizing.</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline hover:text-primary/80"
            >
              Open raw video file directly
            </a>
          </div>
        ) : (
          <video
            src={url}
            controls
            autoPlay
            loop
            muted
            className="w-full h-full object-contain"
            onError={() => setError(true)}
          />
        )}
      </div>
    </div>
  );
}

