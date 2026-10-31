import type { Country } from '../shared/game';

// Original schematic silhouettes for orientation, not precise borders.
const outlines: Record<Country, string> = {
  PT: 'M52 207L67 210L64 231L62 248L48 249L49 232Z',
  ES: 'M67 207L124 211L142 225L132 243L111 254L64 250L64 231Z',
  FR: 'M117 141L136 137L147 148L168 144L188 166L183 186L166 196L145 214L123 207L127 181L112 172L99 166L103 155Z',
  NL: 'M180 106L189 101L194 120L185 131L175 125Z',
  GB: 'M111 54L127 45L136 55L125 70L130 83L140 91L138 112L148 132L131 143L108 143L112 134L122 130L118 116L107 111L113 97L105 88L99 74Z',
  IT: 'M196 182L211 180L226 191L218 201L232 220L243 233L255 231L261 241L247 246L242 258L233 258L228 248L219 238L207 222L205 207L192 198Z M234 269L251 266L249 278Z M190 236L198 240L196 256L189 252Z',
};
const labels: Record<Country, [number, number]> = { PT: [55, 229], ES: [99, 234], FR: [148, 178], NL: [201, 114], GB: [119, 96], IT: [218, 219] };

export function Countries({ countries, selected, onSelect, disabled = false }: { countries: { id: Country; name: string }[]; selected: Country | null; onSelect?: (country: Country) => void; disabled?: boolean }) {
  return <div className="countries">
    <svg viewBox="30 30 250 265" role="img" aria-label="Six country options on a schematic map">
      {countries.map(c => <g key={c.id}><path data-country={c.id} data-selected={selected === c.id} d={outlines[c.id]} fill={selected === c.id ? '#547449' : '#e3dcc7'} stroke="#596656" strokeWidth="1.5" /><text x={labels[c.id][0]} y={labels[c.id][1]} textAnchor="middle" fill={selected === c.id ? '#fff' : '#24382e'} fontSize="10">{c.id}</text></g>)}
    </svg>
    <div className="country-buttons">{countries.map(c => !onSelect ? <span key={c.id} className="country-option">{c.name}</span> : <button key={c.id} type="button" className="secondary" aria-pressed={selected === c.id} disabled={disabled || !onSelect} onClick={() => onSelect?.(c.id)}>{c.name}</button>)}</div>
  </div>;
}
