import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Photo } from '../data/types';
import { getBlob } from '../lib/db';
import { storageUrl } from '../sync/client';
import { photoStamp } from '../lib/format';
import { useStore } from '../store/store';

// Photos picked on this phone are stored as blobs in IndexedDB; demo photos are remote URLs.
const urlCache = new Map<string, string>();

type PhotoRef = { id?: string; src?: string; blobKey?: string; path?: string; displayPath?: string };

/** Demo URL, the file on this phone, an offline copy, or the shared archive's copy – in that order. */
export function usePhotoUrl(p: PhotoRef | null | undefined) {
  const key = p?.blobKey;
  const remote = p?.displayPath || p?.path;
  const cacheId = key || (p?.id && remote ? 'r:' + p.id : undefined);
  const [url, setUrl] = useState<string | undefined>(() => p?.src ?? (cacheId ? urlCache.get(cacheId) : undefined));
  useEffect(() => {
    if (p?.src) { setUrl(p.src); return; }
    if (!cacheId) { setUrl(undefined); return; }
    const hit = urlCache.get(cacheId);
    if (hit) { setUrl(hit); return; }
    let live = true;
    (async () => {
      let u: string | null = null;
      const b = key ? await getBlob(key) : null;
      if (b) u = URL.createObjectURL(b);
      else if (p?.id && remote) u = await storageUrl({ id: p.id, path: p.path, displayPath: p.displayPath }).catch(() => null);
      if (!u || !live) return;
      urlCache.set(cacheId, u);
      setUrl(u);
    })();
    return () => { live = false; };
  }, [p?.src, cacheId, remote]);
  return url;
}

/** An <img> that hides itself if the file can't be loaded, leaving the paper-toned placeholder. */
export function Img({ photo, alt = '', className = 'fill', style, fit }: { photo: PhotoRef | null | undefined; alt?: string; className?: string; style?: CSSProperties; fit?: 'cover' | 'contain' }) {
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
