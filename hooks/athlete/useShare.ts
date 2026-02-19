'use client';

import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { toast } from 'sonner';
import ShareCard, { type ShareData } from '@/components/athlete/ShareCard';
import { supabase } from '@/lib/supabase';

export type { ShareData } from '@/components/athlete/ShareCard';

// Module-level caches
let cachedLogoBase64: string | null = null;
let cachedAthleteName: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;
  const response = await fetch('/logo-dark.png');
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      cachedLogoBase64 = reader.result as string;
      resolve(cachedLogoBase64);
    };
    reader.readAsDataURL(blob);
  });
}

async function getAthleteName(): Promise<string> {
  if (cachedAthleteName) return cachedAthleteName;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';
    const { data } = await supabase
      .from('members')
      .select('display_name, name')
      .eq('id', user.id)
      .single();
    const name = data?.display_name || data?.name || '';
    cachedAthleteName = name;
    return name;
  } catch {
    return '';
  }
}

export function useShare() {
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async (data: ShareData) => {
    setSharing(true);
    try {
      // Resolve athlete name if not provided
      const athleteName = data.athleteName || await getAthleteName();
      const logoBase64 = await getLogoBase64();

      const finalData: ShareData = { ...data, athleteName };

      // Create hidden container
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(container);

      // Render ShareCard
      const root = createRoot(container);
      root.render(React.createElement(ShareCard, { data: finalData, logoBase64 }));

      // Wait for React to flush
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      // Capture to PNG
      const cardEl = container.firstElementChild as HTMLElement;
      const dataUrl = await toPng(cardEl, { pixelRatio: 2 });

      // Cleanup React + DOM
      root.unmount();
      document.body.removeChild(container);

      // Convert to File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'forge-result.png', { type: 'image/png' });

      // Share or download
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        toast.success('Shared!');
      } else {
        // Desktop: try File System Access API (lets user pick save location)
        if ('showSaveFilePicker' in window) {
          try {
            const handle = await (window as unknown as { showSaveFilePicker: (opts: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
              suggestedName: 'forge-result.png',
              types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            toast.success('Image saved!');
          } catch (saveErr: unknown) {
            // User cancelled save dialog
            if (saveErr instanceof Error && saveErr.name === 'AbortError') return;
            throw saveErr;
          }
        } else {
          // Fallback: auto-download
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'forge-result.png';
          a.click();
          toast.success('Image downloaded!');
        }
      }
    } catch (err: unknown) {
      // User cancelling share sheet throws AbortError — not a real error
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Share failed:', err);
      toast.error('Failed to generate share card');
    } finally {
      setSharing(false);
    }
  }, []);

  return { share, sharing };
}
