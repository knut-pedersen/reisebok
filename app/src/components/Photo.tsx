import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Photo } from '../data/types';
import { getBlob } from '../lib/db';
import { photoStamp } from '../lib/format';
import { useStore } from '../store/store';

// Photos picked on this phone are stored as blobs in IndexedDB; demo photos are remote URLs.
const urlCache = new Map<string, string>();

export function usePhotoUrl(p: { src?: string; blobKey?: string } | null | undefined) {
  const key = p?.blobKey;
  const [url, setUrl] = useState<string | undefined>(() => p?.src ?? (key ? urlCache.get(key) : undefined));
  useEffect(() => {
    if (p?.src) { setUrl(p.src); return; }
    if (!key) { setUrl(undefined); return; }
    const hit = urlCache.get(key);
    if (hit) { setUrl(hit); return; }
    let live = true;
    getBlob(key).then(b => {
      if (!b || !live) return;
      const u = URL.createObjectURL(b);
      urlCache.set(key, u);
      setUrl(u);
    });
    return () => { live = false; };
  }, [p?.src, key]);
  return url;
}

/** An <img> that hides itself if the file can't be loaded, leaving the paper-toned placeholder. */
export function Img({ photo, alt = '', className = 'fill', style, fit }: { photo: { src?: string; blobKey?: string } | null | undefined; alt?: string; className?: string; style?: CSSProperties; fit?: 'cover' | 'contain' }) {
  const url = usePhotoUrl(photo);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) return null;
  return <img src={url} alt={alt} loading="lazy" className={className} style={fit ? { ...style, objectFit: fit } : style} onError={() => setFailed(true)} />;
}

export const ratio = (p: Pick<Photo, 'w' | 'h'>) => p.w + ' / ' + p.h;
export const stamp = (p: Pick<Photo, 'taken'>) => photoStamp(p.taken);

export function openLightbox(list: Photo[], i: number) {
  useStore.setState({ lightbox: { list, i } });
}

/** A clickable photo tile in its natural aspect ratio that opens the full view. */
export function PhotoButton({ photo, list, index, style, radius = 8, demoTag, children, label }: { photo: Photo; list?: Photo[]; index?: number; style?: CSSProperties; radius?: number; demoTag?: boolean; children?: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      className="ph ph-btn"
      aria-label={label ?? (photo.caption || 'Åpne bilde')}
      onClick={() => openLightbox(list || [photo], index ?? 0)}
      style={{ borderRadius: radius, aspectRatio: ratio(photo), ...style }}
    >
      <Img photo={photo} alt={photo.caption} />
      {demoTag && photo.src && <span className="demo-tag">demo</span>}
      {children}
    </button>
  );
}
