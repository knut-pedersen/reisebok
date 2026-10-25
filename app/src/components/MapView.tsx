import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import type { MapData } from '../store/derive';

// Tile provider is configurable (.env). Default: CARTO Voyager, built on OpenStreetMap data.
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere © <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = import.meta.env.VITE_MAP_TILE_SUBDOMAINS || 'abcd';
const TILE_MAX_ZOOM = Number(import.meta.env.VITE_MAP_TILE_MAX_ZOOM || 19);

const GLYPH: Record<string, string> = { mat: 'M', overnatting: 'O', kultur: 'K', natur: 'N', severdighet: 'S', hverdag: 'H' };
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface MapFilter { tripId?: string | null; year?: string | null }
export interface MapFocus { id: string | null; lat: number; lng: number; zoom: number; n: number }

interface Props {
  data: MapData;
  filter: MapFilter;
  selectedId: string | null;
  /** Fit these points when `fitKey` changes. */
  fit?: [number, number][] | null;
  fitKey?: string;
  focus?: MapFocus | null;
  visible?: boolean;
  title: string;
  onSelect?: (kind: 'destination' | 'place', id: string) => void;
  onDeselect?: () => void;
  onZoom?: (z: number) => void;
}

/** The album-toned world map. Destinations at low zoom, concrete places when zoomed in. */
export default function MapView({ data, filter, selectedId, fit, fitKey, focus, visible = true, title, onSelect, onDeselect, onZoom }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const props = useRef({ data, filter, selectedId, onSelect, onDeselect, onZoom });
  props.current = { data, filter, selectedId, onSelect, onDeselect, onZoom };

  const render = () => {
    const m = map.current, lg = layer.current;
    if (!m || !lg) return;
    const { data, filter, selectedId, onSelect } = props.current;
    lg.clearLayers();
    const z = m.getZoom();
    const tripF = filter.tripId && filter.tripId !== 'alle' ? filter.tripId : null;
    const yearF = filter.year && filter.year !== 'alle' ? filter.year : null;
    const tripMatch = (ids: string[]) => (tripF ? ids.includes(tripF) : yearF ? ids.some(id => id.includes(yearF)) : true);
    if (z < 9) {
      data.destinations.forEach(d => {
        if (yearF === 'planlagt') { if (d.status !== 'planlagt') return; }
        else if (yearF === 'drom') { if (d.status !== 'drom') return; }
        else if ((yearF || tripF) && !tripMatch(d.tripIds)) return;
        const sub = d.status === 'besokt' ? d.tripIds.length + (d.tripIds.length === 1 ? ' reise' : ' reiser') : d.status === 'planlagt' ? 'kommende' : 'drøm';
        const html = `<div class="rb-dest ${d.status}${selectedId === d.id ? ' sel' : ''}">${d.photoSrc ? `<img alt="" src="${esc(d.photoSrc)}">` : '<span class="noimg"></span>'}<span>${esc(d.name)}</span><small>· ${sub}</small></div>`;
        const mk = L.marker([d.lat, d.lng], { icon: L.divIcon({ html, className: '', iconSize: [0, 0] }), keyboard: true, title: d.name + ', ' + sub, alt: d.name + ', ' + sub });
        mk.on('click', () => onSelect?.('destination', d.id));
        lg.addLayer(mk);
      });
    } else {
      const showLbl = z >= 13;
      data.places.forEach(p => {
        if (yearF && yearF !== 'planlagt' && yearF !== 'drom' && !tripMatch(p.tripIds)) return;
        const inTrip = !tripF || p.tripIds.includes(tripF);
        const cls = 'rb-place ' + p.type + (inTrip ? (tripF ? ' hl' : '') : ' dim') + (selectedId === p.id ? ' sel' : '');
        const html = `<div class="${cls}">${GLYPH[p.type] || '•'}${p.photoSrc ? `<img class="ph-mini" alt="" src="${esc(p.photoSrc)}">` : ''}${showLbl ? `<span class="lbl">${esc(p.name)}</span>` : ''}</div>`;
        const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: '', iconSize: [0, 0] }), keyboard: true, title: p.name + ', ' + p.typeLabel, alt: p.name + ', ' + p.typeLabel, zIndexOffset: selectedId === p.id ? 1000 : 0 });
        mk.on('click', () => onSelect?.('place', p.id));
        lg.addLayer(mk);
      });
    }
  };

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, worldCopyJump: true, zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced }).setView([30, 10], 2);
    map.current = m;
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Zoom inn', zoomOutTitle: 'Zoom ut' }).addTo(m);
    m.attributionControl.setPrefix(false);
    // Natural Earth outlines (public domain) underneath – visible when zoomed out, also if tiles fail.
    m.createPane('base').style.zIndex = '150';
    const baseVis = () => { m.getPane('base')!.style.display = m.getZoom() >= 8 ? 'none' : ''; };
    baseVis();
    Promise.all([import('topojson-client'), import('world-atlas/countries-50m.json')])
      .then(([topo, world]) => {
        const t = (world as { default?: unknown }).default ?? world;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo = topo.feature(t as any, (t as any).objects.countries);
        L.geoJSON(geo as unknown as GeoJSON.FeatureCollection, { pane: 'base', interactive: false, style: { color: '#B9AC97', weight: 0.8, fillColor: '#F3ECDF', fillOpacity: 1 } }).addTo(m);
      })
      .catch(() => {});
    m.attributionControl.addAttribution('Kartdata: Natural Earth');
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: TILE_SUBDOMAINS, maxZoom: TILE_MAX_ZOOM }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on('zoomend', () => { baseVis(); render(); props.current.onZoom?.(m.getZoom()); });
    m.on('click', () => props.current.onDeselect?.());
    render();
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(render, [data, filter.tripId, filter.year, selectedId]);

  useEffect(() => {
    const m = map.current;
    if (!m || !fit || !fit.length) return;
    m.fitBounds(fit, { padding: [40, 40], maxZoom: 14, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    if (reduced) m.setView([focus.lat, focus.lng], focus.zoom, { animate: false });
    else m.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.8 });
  }, [focus?.n]);

  useEffect(() => {
    if (visible) setTimeout(() => map.current?.invalidateSize(), 30);
  }, [visible]);

  return <div ref={el} className="rb-map" role="application" aria-label={title} />;
}
