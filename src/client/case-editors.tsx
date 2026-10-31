import { useEffect, useRef, useState } from 'react';
import { captionSchema, type GameAction, type Strokes } from '../shared/game';
import type { GameView } from '../shared/game-view';
import type { CaseControls } from './case-channel';
import { DrawingSurface } from './drawing';
import { Countries } from './countries';

interface Access { view: GameView; controls: CaseControls; connected: boolean; busy: boolean; pending: boolean }

// The editable value may be ahead of the accepted value. Neither an optimistic
// edit nor a missing ACK is labelled Saved. Debouncing also bounds wire traffic.
function useDraft<T>(accepted: T, revision: number, locked: boolean, access: Access, valid: (value: T) => boolean, action: (value: T, final: boolean) => GameAction, normalize: (value: T) => T) {
  const [value, setValue] = useState(accepted);
  const attempted = useRef('');
  const fingerprint = JSON.stringify(normalize(value)), acceptedFingerprint = JSON.stringify(normalize(accepted));
  const dirty = fingerprint !== acceptedFingerprint, validValue = valid(value);
  const signature = `${revision}:${fingerprint}`;
  const disabled = locked || !access.connected || access.busy || access.pending;
  useEffect(() => { if (locked) setValue(accepted); }, [locked, acceptedFingerprint]);
  async function save(final = false) {
    if (disabled || !validValue) return;
    attempted.current = signature;
    await access.controls.act(action(normalize(value), final));
  }
  useEffect(() => {
    if (disabled || !dirty || !validValue || attempted.current === signature) return;
    const timer = setTimeout(() => { void save(); }, 1000);
    return () => clearTimeout(timer);
  }, [disabled, dirty, validValue, signature]);
  const status = locked ? 'Locked' : access.busy ? 'Saving…' : access.pending ? 'Unconfirmed' : !access.connected ? 'Disconnected / unsaved' : dirty ? 'Unsaved' : 'Saved';
  return { value, setValue, save, status, disabled, dirty, validValue };
}

export function DrawingEditor(access: Access) {
  const accepted = access.view.self.drawing;
  const draft = useDraft({ strokes: accepted.strokes, caption: accepted.caption }, accepted.revision, accepted.locked, access,
    value => captionSchema.safeParse(value.caption).success,
    (value, final) => ({ type: final ? 'submit-drawing' : 'save-drawing', expectedRevision: accepted.revision, ...value }),
    value => ({ ...value, caption: value.caption.trim() }));
  const updateStrokes = (strokes: Strokes) => draft.setValue(value => ({ ...value, strokes }));
  return <section aria-label="Your sketch">
    <h3>Draw your alibi</h3><p>Include both details on your card. One black pen. Drawing talent is optional.</p>
    <DrawingSurface strokes={draft.value.strokes} onChange={updateStrokes} readOnly={accepted.locked || !access.connected || access.pending} />
    <div className="actions"><button className="secondary" disabled={accepted.locked || !access.connected || !draft.value.strokes.length} onClick={() => updateStrokes(draft.value.strokes.slice(0, -1))}>Undo stroke</button><button className="secondary" disabled={accepted.locked || !access.connected} onClick={() => updateStrokes([])}>Clear sketch</button></div>
    <label>Caption<input value={draft.value.caption} disabled={accepted.locked} onChange={event => draft.setValue(value => ({ ...value, caption: event.target.value }))} aria-describedby="caption-help" /></label>
    <p id="caption-help" className="hint">Optional: up to five words and 80 characters.</p>
    {!draft.validValue && <p role="alert">Caption must contain at most five words and 80 characters. Your previous saved draft is unchanged.</p>}
    <p aria-label="Drawing save status" aria-live="polite" className="save-status">{draft.status}</p>
    {!accepted.locked && <div className="actions"><button className="secondary" disabled={draft.disabled || !draft.validValue || !draft.dirty} onClick={() => void draft.save()}>Save draft</button><button disabled={draft.disabled || !draft.validValue || !draft.value.strokes.length} onClick={() => void draft.save(true)}>Submit and lock</button></div>}
    <p className="hint">Submitting locks your drawing and caption. At the deadline, your latest accepted draft locks automatically. It stays private until Gallery.</p>
  </section>;
}

export function BallotEditor(access: Access) {
  const final = access.view.phase === 'Verdict', accepted = final ? access.view.self.final : access.view.self.initial;
  const draft = useDraft({ country: accepted.country, suspectId: accepted.suspectId, reason: accepted.reason }, accepted.revision, accepted.locked, access,
    value => !final || [...value.reason.trim()].length <= 160,
    value => final ? { type: 'save-final', expectedRevision: accepted.revision, ...value } : { type: 'save-initial', expectedRevision: accepted.revision, country: value.country, suspectId: value.suspectId },
    value => ({ ...value, reason: value.reason.trim() }));
  const locked = accepted.locked || !access.connected;
  return <section aria-label={final ? 'Your final verdict' : 'Your initial choices'}>
    <h3>{final ? 'Your final verdict' : 'First impressions'}</h3>
    <p>{final ? 'Saved selections lock when time expires. You can change or clear them until then.' : 'These private choices help the debrief. They do not earn points or carry into your final verdict.'}</p>
    <Countries countries={access.view.public.countries} selected={draft.value.country} disabled={locked} onSelect={country => draft.setValue(value => ({ ...value, country }))} />
    <button className="secondary" disabled={locked || !draft.value.country} onClick={() => draft.setValue(value => ({ ...value, country: null }))}>Clear country</button>
    <label>Accuse a player<select value={draft.value.suspectId ?? ''} disabled={locked} onChange={event => draft.setValue(value => ({ ...value, suspectId: event.target.value || null }))}><option value="">No accusation</option>{access.view.public.players.filter(p => p.id !== access.view.self.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {final && <><label>Reason (optional)<textarea value={draft.value.reason} disabled={locked} onChange={event => draft.setValue(value => ({ ...value, reason: event.target.value }))} /></label><p className="hint">Up to 160 characters. Visible to everyone at Solution.</p></>}
    {!draft.validValue && <p role="alert">Reason must contain at most 160 characters. Your previous saved ballot is unchanged.</p>}
    <p aria-label="Ballot save status" aria-live="polite" className="save-status">{draft.status}</p>
    <button className="secondary" disabled={draft.disabled || !draft.validValue || !draft.dirty} onClick={() => void draft.save()}>Save {final ? 'final verdict' : 'initial choices'}</button>
  </section>;
}
