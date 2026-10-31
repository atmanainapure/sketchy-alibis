import { useEffect, useRef, useState } from 'react';
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
import type { GameView } from '../shared/game-view';

export function Photo({ roomCode, view }: { roomCode: string; view: GameView }) {
  const img = useRef<HTMLImageElement>(null), zoom = useRef<PanzoomObject | null>(null);
  const [attempt, setAttempt] = useState(0), [loaded, setLoaded] = useState(false), [failed, setFailed] = useState(false), [scale, setScale] = useState(1);
  const flagKey = `sketchy-photo-affected:${view.caseId}`;
  const [affected, setAffected] = useState(() => { try { return sessionStorage.getItem(flagKey) === '1'; } catch { return false; } });
  useEffect(() => {
    if (!loaded || !img.current) return;
    const image = img.current;
    zoom.current = Panzoom(image, { minScale: 1, maxScale: 8, panOnlyWhenZoomed: true, animate: false, touchAction: 'pan-y' });
    const changed = () => {
      const next = zoom.current?.getScale() ?? 1;
      setScale(next);
      zoom.current?.setOptions({ touchAction: next > 1 ? 'none' : 'pan-y' });
    };
    image.addEventListener('panzoomchange', changed);
    return () => { image.removeEventListener('panzoomchange', changed); zoom.current?.destroy(); zoom.current = null; };
  }, [loaded, attempt]);
  function fail() {
    setFailed(true); setLoaded(false); setAffected(true);
    try { sessionStorage.setItem(flagKey, '1'); } catch { /* Current view still records the affected session. */ }
  }
  return <section id="case-photo" tabIndex={-1} className="photo-panel panel" aria-label="Location photograph">
    <h3>Find the place</h3><p>{view.public.opening.photoContext}</p>
    <div className="photo-window" role="group" aria-label="Photograph inspection area" aria-describedby="photo-help" tabIndex={0} onKeyDown={event => {
      const direction = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
      if (!direction || !zoom.current || scale <= 1) return;
      event.preventDefault();
      zoom.current.pan(direction[0] * 60 / scale, direction[1] * 60 / scale, { relative: true, animate: false });
    }}>
      <img ref={img} src={`/api/rooms/${encodeURIComponent(roomCode)}/cases/${view.caseId}/photo?attempt=${attempt}`} alt={view.public.photo.alt} onLoad={() => { setLoaded(true); setFailed(false); }} onError={fail} hidden={failed} draggable={false} />
      {!loaded && !failed && <p>Loading photograph…</p>}
      {failed && <div><p role="alert">The photograph could not load. The case clock continues.</p><button onClick={() => { setFailed(false); setLoaded(false); setAttempt(n => n + 1); }}>Retry photograph</button></div>}
    </div>
    <div className="actions photo-tools"><button className="secondary" disabled={!loaded || scale >= 8} onClick={() => zoom.current?.zoomIn({ animate: false })}>Zoom in</button><button className="secondary" disabled={!loaded || scale <= 1} onClick={() => zoom.current?.zoomOut({ animate: false })}>Zoom out</button><button className="secondary" disabled={!loaded} onClick={() => zoom.current?.reset({ animate: false })}>Reset photo</button><output aria-label="Photo zoom">{Math.round(scale * 100)}%</output></div>
    <p id="photo-help" className="hint">Zoom in, then drag the photograph or focus it and use arrow keys to inspect a clue. At 100%, swipe to scroll the page. Reset photo to see the whole scene.</p>
    {affected && <p className="notice">Photo access failed during this session. Note this when discussing the result.</p>}
  </section>;
}
