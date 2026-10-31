import { useEffect, useRef, useState } from 'react';
import { Canvas, type CanvasPath, type Point } from 'react-sketch-canvas';
import type { Strokes } from '../shared/game';

// Controlled paths replace the widget's state; restore never appends old marks.
// Coordinates stay in the same unit square at every rendered size.
export function DrawingSurface({ strokes, onChange, readOnly = false, label = 'Drawing surface' }: {
  strokes: Strokes; onChange?: (strokes: Strokes) => void; readOnly?: boolean; label?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0), [drawing, setDrawing] = useState(false), [limit, setLimit] = useState(false);
  const current = useRef(strokes); current.current = strokes;
  useEffect(() => {
    const observer = new ResizeObserver(entries => setSize(entries[0].contentRect.width));
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  const point = (p: Point) => ({ x: Math.round(Math.min(1, Math.max(0, p.x / size)) * 1000) / 1000, y: Math.round(Math.min(1, Math.max(0, p.y / size)) * 1000) / 1000 });
  const commit = (next: Strokes) => { current.current = next; onChange?.(next); };
  const full = () => current.current.reduce((n, s) => n + s.length, 0) >= 1900;
  const paths: CanvasPath[] = strokes.map(paths => ({ paths: paths.map(p => ({ x: p.x * size, y: p.y * size })), strokeWidth: size * .007, strokeColor: '#111111', drawMode: true }));
  return <>
    <div ref={element} className="drawing-square" role="img" aria-label={label}>
      <Canvas paths={paths} isDrawing={drawing} readOnly={readOnly || !size} allowOnlyPointerType="all" backgroundImage="" canvasColor="#ffffff" exportWithBackgroundImage={false} width="100%" height="100%" style={{ border: 'none' }} svgStyle={{}} withViewBox
        onPointerDown={p => {
          if (readOnly || !size) return;
          if (current.current.length >= 128 || full()) { setLimit(true); return; }
          setLimit(false); setDrawing(true); commit([...current.current, [point(p)]]);
        }}
        onPointerMove={p => {
          if (readOnly || !drawing || !current.current.length) return;
          if (full()) { setLimit(true); return; }
          const stroke = current.current.at(-1)!, next = point(p), prior = stroke.at(-1)!;
          if (next.x !== prior.x || next.y !== prior.y) commit([...current.current.slice(0, -1), [...stroke, next]]);
        }}
        onPointerUp={() => setDrawing(false)} />
    </div>
    {limit && !readOnly && <p role="alert">Sketch full. Undo a stroke or clear to continue.</p>}
  </>;
}
