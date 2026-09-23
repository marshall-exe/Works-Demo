'use client';
import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PLACES, placeById, type Place } from '../../lib/shams/places';

export type MapView =
  | { kind: 'overview' }
  | { kind: 'places'; ids: string[]; caption?: string }
  | { kind: 'plan'; title: string; days: { label: string; ids: string[] }[] };

const OVERVIEW = ['erbil', 'sulaymaniyah', 'duhok', 'halabja', 'rawanduz'];
// Esri Canvas basemaps: keyless, with a separate label layer so place names stay crisp in both themes.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
const tiles = (light: boolean) => `${ESRI}${light ? 'World_Light_Gray_Base' : 'World_Dark_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`;
const labels = (light: boolean) => `${ESRI}${light ? 'World_Light_Gray_Reference' : 'World_Dark_Gray_Reference'}/MapServer/tile/{z}/{y}/{x}`;

export default function ShamsMap({ view, reduced }: { view: MapView; reduced: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const tileLayer = useRef<Leaflet.TileLayer | null>(null);
  const labelLayer = useRef<Leaflet.TileLayer | null>(null);
  const pending = useRef<MapView>(view);

  const draw = (v: MapView) => {
    const lf = L.current, m = map.current, g = layer.current;
    if (!lf || !m || !g) return;
    g.clearLayers();
    const pin = (p: Place, label: string, strong: boolean, tip: boolean) => {
      const icon = lf.divIcon({ className: 'shams-pin-wrap', html: `<span class="shams-pin${strong ? ' strong' : ''}">${label}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      const mk = lf.marker([p.lat, p.lng], { icon, keyboard: true, title: p.name, alt: p.name }).addTo(g);
      mk.bindPopup(`<b>${p.name}</b><br/><span>${p.blurb}</span>`, { closeButton: false, className: 'shams-popup', maxWidth: 240 });
      if (tip) mk.bindTooltip(p.name, { permanent: true, direction: 'right', offset: [12, 0], className: 'shams-tip' });
      return mk;
    };
    let pts: Place[] = [];
    if (v.kind === 'overview') {
      pts = OVERVIEW.map(placeById).filter(Boolean) as Place[];
      pts.forEach((p) => pin(p, '', false, true));
    } else if (v.kind === 'places') {
      pts = v.ids.map(placeById).filter(Boolean) as Place[];
      pts.forEach((p, i) => pin(p, String(i + 1), true, pts.length <= 6));
    } else {
      v.days.forEach((d, di) => {
        const dayPts = d.ids.map(placeById).filter(Boolean) as Place[];
        dayPts.forEach((p) => pin(p, String(di + 1), true, false));
        pts = pts.concat(dayPts);
      });
      if (pts.length > 1) lf.polyline(pts.map((p) => [p.lat, p.lng] as [number, number]), { color: '#c1272d', weight: 2.5, opacity: 0.85, dashArray: '6 7' }).addTo(g);
    }
    if (!pts.length) return;
    const b = lf.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number]));
    const opts = { padding: [42, 42] as [number, number], maxZoom: pts.length === 1 ? 12 : 11 };
    if (reduced) m.fitBounds(b, opts); else m.flyToBounds(b, { ...opts, duration: 1.1 });
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      const lf = (await import('leaflet')).default;
      if (dead || !el.current) return;
      L.current = lf;
      const m = lf.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false, worldCopyJump: false, minZoom: 5, maxZoom: 16 });
      lf.control.zoom({ position: 'bottomright' }).addTo(m);
      m.attributionControl.setPrefix(false);
      const light = document.documentElement.dataset.theme === 'light';
      tileLayer.current = lf.tileLayer(tiles(light), { maxZoom: 16, maxNativeZoom: 16, attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors' }).addTo(m);
      labelLayer.current = lf.tileLayer(labels(light), { maxZoom: 16, maxNativeZoom: 16, pane: 'overlayPane', opacity: 0.9 }).addTo(m);
      layer.current = lf.layerGroup().addTo(m);
      const all = lf.latLngBounds(PLACES.map((p) => [p.lat, p.lng] as [number, number]));
      m.fitBounds(all, { padding: [30, 30] });
      map.current = m;
      m.on('focus', () => m.scrollWheelZoom.enable());
      m.on('blur', () => m.scrollWheelZoom.disable());
      draw(pending.current);
    })();
    const themeObs = new MutationObserver(() => {
      const light = document.documentElement.dataset.theme === 'light';
      tileLayer.current?.setUrl(tiles(light));
      labelLayer.current?.setUrl(labels(light));
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const ro = new ResizeObserver(() => map.current?.invalidateSize());
    if (el.current) ro.observe(el.current);
    return () => { dead = true; themeObs.disconnect(); ro.disconnect(); map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { pending.current = view; draw(view); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view]);

  return <div ref={el} className="shams-map-canvas" role="region" aria-label="Map of places Shams mentions" data-lenis-prevent />;
}
