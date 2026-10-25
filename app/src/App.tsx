import { useEffect, useLayoutEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { matchPath, Navigate, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Pair } from './components/bits';
import { AddMenu, Lightbox, SyncPanel, Toasts } from './components/Overlays';
import { PEOPLE } from './lib/format';
import { paths, useBack } from './lib/nav';
import { setScroller } from './lib/page';
import { queueStatus } from './store/derive';
import { useStore } from './store/store';
import AboutPage from './views/AboutPage';
import BookPage from './views/BookPage';
import DayPage from './views/DayPage';
import DreamsPage from './views/DreamsPage';
import ExportPage from './views/ExportPage';
import ImportPage from './views/ImportPage';
import Library from './views/Library';
import LoginPage from './views/LoginPage';
import MapPage from './views/MapPage';
import MemoryPage from './views/MemoryPage';
import NewMemoryPage from './views/NewMemoryPage';
import NewTripPage from './views/NewTripPage';
import PlacePage from './views/PlacePage';
import SettingsPage from './views/SettingsPage';
import TripPage from './views/TripPage';

const NAV = [
  { id: 'kart', to: paths.map(), label: 'Kart', glyph: '◎' },
  { id: 'reiser', to: paths.trips(), label: 'Reiser', glyph: '▤' },
  { id: 'drommer', to: paths.dreams(), label: 'Drømmer', glyph: '☆' },
] as const;

function section(pathname: string) {
  if (pathname === '/') return 'kart';
  if (pathname.startsWith('/drommer')) return 'drommer';
  if (/^\/(reiser|reise|minne|sted)/.test(pathname)) return 'reiser';
  return null;
}

export default function App() {
  const ready = useStore(s => s.ready);
  const loggedIn = useStore(s => s.loggedIn);
  if (!ready) return <div style={{ height: '100%', background: 'var(--cream)' }} />;
  if (!loggedIn) return <LoginPage />;
  return <Shell />;
}

function Shell() {
  const loc = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const back = useBack('/');
  const isMobile = useStore(s => s.isMobile);
  const user = useStore(s => s.user);
  const pageTitle = useStore(s => s.pageTitle);
  const sync = useStore(useShallow(queueStatus));
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPos = useRef(new Map<string, number>());

  useEffect(() => {
    const onResize = () => { const m = window.innerWidth < 820; if (m !== useStore.getState().isMobile) useStore.setState({ isMobile: m }); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Scroll: new screens start at the top; «Tilbake» returns to the same place on the page.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (navType === 'POP') {
      const y = scrollPos.current.get(loc.key) ?? 0;
      el.scrollTop = y;
      const t = setTimeout(() => { el.scrollTop = y; }, 60);
      return () => clearTimeout(t);
    }
    if (navType === 'PUSH') el.scrollTop = 0;
  }, [loc.key]);

  const onMap = loc.pathname === '/';
  const sec = section(loc.pathname);
  const topNav = onMap || loc.pathname === '/reiser' || loc.pathname === '/drommer';
  const tripMatch = matchPath('/reise/:tripId/*', loc.pathname) || matchPath('/reise/:tripId', loc.pathname);
  const dayMatch = matchPath('/reise/:tripId/dag/:idx', loc.pathname);
  const ctxTripId = tripMatch?.params.tripId ?? null;
  const ctxDate = useStore(s => (dayMatch && ctxTripId ? s.trips.find(t => t.id === ctxTripId)?.days[Number(dayMatch.params.idx)]?.date : undefined));

  const openSync = () => useStore.setState({ syncOpen: true });
  const toggleAdd = () => useStore.setState(s => ({ addOpen: !s.addOpen }));
  const me = PEOPLE[user];

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', background: 'var(--cream)' }}>
      {!isMobile && (
        <nav aria-label="Hovedmeny" style={{ width: 232, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--paper)', borderRight: '1px solid var(--line)', padding: '28px 20px 20px', gap: 4 }}>
          <div style={{ padding: '0 8px 24px' }}>
            <div className="hand" style={{ fontSize: 20, color: 'var(--terracotta)', lineHeight: 1 }}>Knut &amp; Anna</div>
            <div className="serif" style={{ fontWeight: 500, fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>Vår reisebok</div>
          </div>
          {NAV.map(n => {
            const active = sec === n.id;
            return (
              <button key={n.id} onClick={() => navigate(n.to)} aria-current={active ? 'page' : undefined} className="row nav-item"
                style={{ gap: 12, minHeight: 46, padding: '0 12px', borderRadius: 10, border: 0, background: 'transparent', fontSize: 16, textAlign: 'left', color: active ? 'var(--terracotta)' : 'var(--ink)', fontWeight: loc.pathname === n.to ? 600 : 500 }}>
                <span style={{ width: 22, textAlign: 'center', fontSize: 16 }} aria-hidden="true">{n.glyph}</span>{n.label}
              </button>
            );
          })}
          <button onClick={toggleAdd} className="btn btn-primary" style={{ margin: '16px 0 0', minHeight: 46, padding: '0 16px' }}><span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">+</span>Legg til</button>
          <div style={{ flex: 1 }} />
          <button onClick={openSync} className="row nav-item" style={{ gap: 8, minHeight: 40, padding: '0 10px', borderRadius: 8, border: 0, background: 'transparent', fontSize: 13, textAlign: 'left' }}>
            <span className="dot" style={{ background: sync.tone }} /><span style={{ flex: 1 }}>{sync.label}</span>
          </button>
          <button onClick={() => navigate(paths.settings())} className="row nav-item" style={{ gap: 10, minHeight: 48, padding: '0 10px', borderRadius: 10, border: 0, background: 'transparent', textAlign: 'left' }}>
            <Pair size={28} />
            <span className="stack" style={{ lineHeight: 1.2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>Knut &amp; Anna</span><span className="xs muted">Du er {me.name} · Innstillinger</span></span>
          </button>
        </nav>
      )}
      <main style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <header className="row" style={{ flex: 'none', gap: 8, minHeight: 56, padding: '6px 8px 6px 12px', background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
            {topNav ? (
              <div className="stack" style={{ flex: 1, lineHeight: 1.1 }}>
                <span className="hand" style={{ fontSize: 15, color: 'var(--terracotta)' }}>Knut &amp; Anna</span>
                <span className="serif" style={{ fontSize: 19, fontWeight: 500 }}>Vår reisebok</span>
              </div>
            ) : (
              <>
                <button onClick={back} aria-label="Tilbake" style={{ width: 44, height: 44, borderRadius: '50%', border: 0, background: 'transparent', fontSize: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>‹</button>
                <div className="serif" style={{ flex: 1, minWidth: 0, fontSize: 19, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageTitle}</div>
              </>
            )}
            <button onClick={openSync} aria-label={'Synkroniseringsstatus: ' + sync.label} className="row" style={{ gap: 6, minHeight: 36, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(46,53,47,.15)', background: 'var(--cream)', fontSize: 12, maxWidth: 160 }}>
              <span className="dot" style={{ width: 8, height: 8, background: sync.tone }} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sync.label}</span>
            </button>
            <button onClick={() => navigate(paths.settings())} aria-label="Profiler og innstillinger" style={{ display: 'inline-flex', border: 0, background: 'transparent', padding: 4 }}><Pair size={26} /></button>
          </header>
        )}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {/* The map stays mounted so its position survives visits to other screens. */}
          <div style={{ position: 'absolute', inset: 0, display: onMap ? 'flex' : 'none' }}>
            <MapPage visible={onMap} />
          </div>
          <div ref={el => { scrollRef.current = el; setScroller(el); }} onScroll={e => scrollPos.current.set(loc.key, e.currentTarget.scrollTop)}
            style={{ position: 'absolute', inset: 0, overflow: 'auto', display: onMap ? 'none' : 'block' }}>
            <div style={{ maxWidth: isMobile ? '100%' : 1120, margin: '0 auto', padding: isMobile ? '16px 16px 110px' : '32px 40px 80px' }}>
              <Routes>
                <Route path="/" element={null} />
                <Route path="/reiser" element={<Library />} />
                <Route path="/reise/:tripId" element={<TripPage />} />
                <Route path="/reise/:tripId/dag/:idx" element={<DayPage />} />
                <Route path="/reise/:tripId/bok" element={<BookPage />} />
                <Route path="/minne/:memId" element={<MemoryPage />} />
                <Route path="/sted/:placeId" element={<PlacePage />} />
                <Route path="/drommer" element={<DreamsPage />} />
                <Route path="/bilder" element={<ImportPage />} />
                <Route path="/ny-reise" element={<NewTripPage />} />
                <Route path="/nytt-minne" element={<NewMemoryPage />} />
                <Route path="/innstillinger" element={<SettingsPage />} />
                <Route path="/eksport" element={<ExportPage />} />
                <Route path="/om" element={<AboutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
        {isMobile && (
          <nav aria-label="Hovedmeny" style={{ flex: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr auto 1fr 1fr', alignItems: 'center', minHeight: 68, padding: '6px 8px calc(10px + env(safe-area-inset-bottom))', background: 'var(--paper)', borderTop: '1px solid var(--line)', position: 'relative', zIndex: 1030 }}>
            {NAV.map((n, i) => {
              const active = sec === n.id;
              return (
                <button key={n.id} onClick={() => navigate(n.to)} aria-current={active ? 'page' : undefined}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52, border: 0, background: 'transparent', fontSize: 12, color: active ? 'var(--terracotta)' : 'var(--ink)', fontWeight: loc.pathname === n.to ? 600 : 500, gridColumn: ['1', '2', '4'][i], gridRow: 1 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">{n.glyph}</span>{n.label}
                </button>
              );
            })}
            <button onClick={toggleAdd} aria-label="Legg til" style={{ gridColumn: 3, gridRow: 1, width: 56, height: 56, borderRadius: '50%', border: 0, background: 'var(--terracotta)', color: 'var(--paper)', fontSize: 30, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 10px', boxShadow: '0 4px 12px rgba(169,85,60,.35)' }}>+</button>
            <button onClick={() => navigate(paths.settings())} style={{ gridColumn: 5, gridRow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 52, border: 0, background: 'transparent', fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'inline-flex' }} aria-hidden="true"><span style={{ width: 20, height: 20, borderRadius: '50%', background: '#596650' }} /><span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--terracotta)', marginLeft: -6, border: '2px solid var(--paper)' }} /></span>Oss
            </button>
          </nav>
        )}
      </main>
      <AddMenu tripId={ctxTripId} date={ctxDate} />
      <SyncPanel />
      <Lightbox />
      <Toasts />
    </div>
  );
}
