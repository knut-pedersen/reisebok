import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type TripTab = 'historien' | 'dager' | 'steder' | 'bilder';

export const paths = {
  map: () => '/',
  trips: () => '/reiser',
  trip: (id: string, opts: { tab?: TripTab; mem?: string | null; vis?: 'kart' | 'tidslinje' } = {}) => {
    const q = new URLSearchParams();
    if (opts.tab && opts.tab !== 'historien') q.set('fane', opts.tab);
    if (opts.mem) q.set('minne', opts.mem);
    if (opts.vis) q.set('vis', opts.vis);
    const s = q.toString();
    return '/reise/' + encodeURIComponent(id) + (s ? '?' + s : '');
  },
  day: (tripId: string, idx: number) => `/reise/${encodeURIComponent(tripId)}/dag/${idx}`,
  book: (tripId: string, pdf?: boolean) => `/reise/${encodeURIComponent(tripId)}/bok${pdf ? '?pdf=1' : ''}`,
  memory: (id: string) => '/minne/' + encodeURIComponent(id),
  place: (id: string) => '/sted/' + encodeURIComponent(id),
  dreams: () => '/drommer',
  import: () => '/bilder',
  newTrip: () => '/ny-reise',
  newMemory: () => '/nytt-minne',
  settings: () => '/innstillinger',
  export: () => '/eksport',
  about: () => '/om',
};

/** «Tilbake» returns to the previous screen (and its scroll position), or to a sensible parent. */
export function useBack(fallback = '/reiser') {
  const navigate = useNavigate();
  const loc = useLocation();
  return useCallback(() => {
    if (loc.key !== 'default' && window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, loc.key, fallback]);
}
