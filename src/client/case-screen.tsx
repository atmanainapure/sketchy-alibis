import { useEffect, useState } from 'react';
import type { GameView, LockMode } from '../shared/game-view';
import type { CaseControls } from './case-channel';
import { Photo } from './photo';
import { Countries } from './countries';
import { BallotEditor, DrawingEditor } from './case-editors';
import { DrawingSurface } from './drawing';

const lockLabel = (mode: LockMode | null) => mode === 'submitted' ? 'Submitted' : mode === 'automatic' ? 'Automatically locked' : 'Missing sketch';
function Countdown({ view, receivedAt }: { view: GameView; receivedAt: number }) {
  const [now, setNow] = useState(performance.now());
  useEffect(() => { const timer = setInterval(() => setNow(performance.now()), 200); return () => clearInterval(timer); }, []);
  if (view.phaseEndsAt === null) return null;
  const seconds = Math.max(0, Math.ceil((view.phaseEndsAt - view.serverTime - Math.max(0, now - receivedAt)) / 1000));
  return <p role="timer" aria-live="off" className="timer">{seconds > 0 ? `${seconds}s remaining` : 'Waiting for the case desk…'}</p>;
}

function Gallery({ view }: { view: GameView }) {
  if (!view.public.gallery) return null;
  return <section id="case-gallery" tabIndex={-1} className="panel gallery" aria-label="Everyone’s sketches"><h3>Everyone’s sketches</h3><p>Ask the artist what happened. A terrible picture is not proof of guilt.</p><div className="sketch-grid">{view.public.gallery.map(drawing => <article key={drawing.playerId} aria-label={`Sketch by ${view.public.players.find(p => p.id === drawing.playerId)?.name}`}>
    <h4>{view.public.players.find(p => p.id === drawing.playerId)?.name}</h4>
    {drawing.strokes.length ? <DrawingSurface readOnly strokes={drawing.strokes} label="Locked drawing" /> : <div className="missing-sketch">No sketch submitted</div>}
    {drawing.caption && <p className="caption">{drawing.caption}</p>}
    <p className="hint">{lockLabel(drawing.lockMode)}</p>
  </article>)}</div></section>;
}

function Evidence({ view }: { view: GameView }) {
  const evidence = view.public.evidence;
  if (!evidence) return null;
  return <section id="case-evidence" tabIndex={-1} className="panel evidence" aria-label="Evidence sheet"><p className="eyebrow">Shared case evidence</p><h3>{evidence.title}</h3><p>{evidence.introduction}</p><div className="evidence-records">{evidence.records.map(record => <article key={record.id}><h4>{record.label}</h4><dl><div><dt>Portugal location</dt><dd>{record.PT.text}</dd></div><div><dt>Spain location</dt><dd>{record.ES.text}</dd></div></dl></article>)}</div></section>;
}

function safeLink(value: string) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; } }
function Reveal({ view }: { view: GameView }) {
  const solution = view.public.solution;
  if (!solution?.result) return null;
  const result = solution.result;
  const name = (id: string | null) => view.public.players.find(p => p.id === id)?.name ?? 'None';
  const country = (id: string | null) => view.public.countries.find(c => c.id === id)?.name ?? 'Not chosen';
  const disconnects = solution.observation.events.some(event => event.type === 'disconnect');
  return <section id="case-result" tabIndex={-1} className="panel reveal" aria-label="Case result">
    <p className="eyebrow">Case closed</p><h3>{name(solution.murdererId)} was the murderer</h3>
    <p className="outcome">Location: <strong>{country(solution.correctCountry)}</strong>. Forgery {solution.selectedForgery}.</p>
    <p>{result.arrestedId ? `Arrested: ${name(result.arrestedId)}` : 'No arrest: tied highest votes or no accusations.'} {result.arrestedId === solution.murdererId ? 'The murderer was caught.' : 'The murderer escaped.'}</p>
    <p><strong>{result.winnerIds.length === 1 ? 'Winner' : 'Shared winners'}: {result.winnerIds.map(name).join(', ')}</strong></p>
    <p>Correct country: 2 points. Innocent players: 3 points for a correct personal accusation. Murderer: 3 points for escaping arrest. A tied highest vote means no arrest.</p><p className="hint">On a narrow screen, scroll the tables sideways to see every column, including Total.</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Score table, scroll horizontally"><table aria-label="Scores"><thead><tr><th>Player</th><th>Country</th><th>Accusation</th><th>Escape</th><th>Total</th></tr></thead><tbody>{result.scores.map(score => <tr key={score.playerId}><th scope="row">{name(score.playerId)}</th><td>{score.country}</td><td>{score.accusation}</td><td>{score.escape}</td><td><strong>{score.total}</strong></td></tr>)}</tbody></table></div>
    <h4>Accusation tally</h4><ul>{result.tally.map(vote => <li key={vote.playerId}>{name(vote.playerId)}: {vote.votes} {vote.votes === 1 ? 'vote' : 'votes'}</li>)}</ul>
    <h4>Why this country changes the story</h4><p>{solution.geography}</p><p>{solution.wrongColumnExplanation}</p>
    <ul>{solution.clues.map(clue => <li key={clue.id}><strong>{clue.visibleText}</strong>: {clue.interpretation}</li>)}</ul>
    <h4>The original cards</h4><div className="card-grid">{solution.cards.map(entry => <article key={entry.playerId}><h5>{name(entry.playerId)} · {entry.guilt}</h5><p>{entry.card?.story}</p><p>Required details: {entry.card?.requiredDetails.join('; ')}</p><p>{solution.alibiExplanations.find(explanation => explanation.alibiId === entry.card?.id)?.text}</p></article>)}</div>
    <h4>Both possible forgeries</h4>{solution.forgeryOptions.map(card => <article key={card.id}><h5>Forgery {card.option}{card.option === solution.selectedForgery ? ' · selected' : ' · unused'}</h5><p>{card.story}</p><p>Required details: {card.requiredDetails.join('; ')}</p><p>{solution.alibiExplanations.find(explanation => explanation.alibiId === card.id)?.text}</p></article>)}
    <h4>Private choices, now revealed</h4><div className="table-scroll" tabIndex={0} role="region" aria-label="Ballot table, scroll horizontally"><table aria-label="Revealed ballots"><thead><tr><th>Player</th><th>Initial country</th><th>Initial suspect</th><th>Final country</th><th>Final suspect</th><th>Reason</th></tr></thead><tbody>{solution.ballots.map(ballot => <tr key={ballot.playerId}><th scope="row">{name(ballot.playerId)}</th><td>{country(ballot.initial.country)}</td><td>{name(ballot.initial.suspectId)}</td><td>{country(ballot.final.country)}</td><td>{name(ballot.final.suspectId)}</td><td>{ballot.final.reason || 'None given'}</td></tr>)}</tbody></table></div>
    <h4>Debrief</h4><p>Which photo clue changed your mind? Which drawing detail did someone challenge? Did a defense sound convincing?</p>
    {disconnects && <p className="notice">A player disconnected during this case. Take that into account when discussing the result.</p>}
    {view.public.gallery?.some(d => d.lockMode === 'missing') && <p className="notice">This case included a missing sketch. Everyone’s saved vote still counted.</p>}
    <p>{solution.provenance.credit}</p><p><a href={safeLink(solution.provenance.sourcePage)} target="_blank" rel="noreferrer">Photograph source</a> · <a href={safeLink(solution.provenance.license.url)} target="_blank" rel="noreferrer">{solution.provenance.license.name}</a></p>
    <p className="hint">One case only. Results remain available for an hour after Complete. This room has no rematch.</p>
  </section>;
}

export function CaseScreen({ roomCode, view, receivedAt, controls, connected, busy, pending, message }: {
  roomCode: string; view: GameView; receivedAt: number; controls: CaseControls; connected: boolean; busy: boolean; pending: boolean; message: string;
}) {
  const access = { view, controls, connected, busy, pending };
  const instruction = { Inspect: 'Read your private alibi and inspect the photograph.', Sketch: 'Draw both required details. Save or submit before time runs out.', Gallery: 'Compare the sketches and save your initial choices.', Interrogate: 'Question the stories and compare the shared records.', Verdict: 'Choose a country and suspect. Only saved final choices count.', Solution: 'Read the results and explanations.', Complete: 'Case closed. Compare the clues and original stories.', Aborted: 'This case cannot continue.' }[view.phase];
  return <div className="game-board">
    <div className="case-guide"><header className="phase-header"><div><h2>{view.phase}</h2></div><Countdown view={view} receivedAt={receivedAt} /></header>
    <p className="phase-instruction">{instruction}</p>
    {!connected && <p role="alert" className="notice">Reconnecting… The case clock continues. Unsaved changes are not confirmed.</p>}
    {view.phase !== 'Aborted' && <nav aria-label="Case sections">
      <a href="#case-private">Your panel</a><a href="#case-photo">Photograph</a>
      {view.public.gallery && <a href="#case-gallery">Drawings</a>}
      {view.public.evidence && <a href="#case-evidence">Evidence</a>}
      {view.public.solution && <a href="#case-result">Results</a>}
    </nav>}</div>
    <h3 className="case-title">{view.public.opening.title}</h3>
    <p>Room <output aria-label="Room code" className="room-code">{roomCode}</output> · You are {view.public.players.find(p => p.id === view.self.id)?.name}</p>
    <p>{view.public.opening.story}</p><p className="fiction-notice">{view.public.opening.fictionNotice}</p>
    {message && <p role="alert" className="notice">{message}</p>}
    {pending && <button disabled={!connected || busy} onClick={() => void controls.retry()}>Retry unconfirmed change</button>}
    {view.phase === 'Aborted' ? <p role="alert" className="notice">{view.public.interruption}</p> : <>
      <div className="case-columns">
        <Photo key={view.caseId} roomCode={roomCode} view={view} />
        <section id="case-private" tabIndex={-1} className="panel private-panel" aria-label="Your private panel"><p className="eyebrow">Only you can see this panel</p>
          <p className="guilt">{view.self.guilt === 'murderer' ? 'You are the murderer.' : 'You are innocent.'}</p>
          {view.self.card && <><h3>Your alibi</h3><p>{view.self.card.story}</p><p><strong>Draw both:</strong> {view.self.card.requiredDetails.join(' + ')}</p></>}
          {view.self.forgery?.defaulted && <p>No choice was saved in Inspect. Forgery A was assigned to you.</p>}
          {view.phase === 'Inspect' && <>
            {view.self.forgeryOptions && <div><h3>Choose your forged story</h3>{view.self.forgeryOptions.map(card => <article className="forgery" key={card.id}><p>{card.story}</p><p>Draw: {card.requiredDetails.join(' + ')}</p><button disabled={!connected || busy || pending} aria-pressed={view.self.forgery?.selected === card.option} onClick={() => void controls.act({ type: 'choose-forgery', option: card.option! })}>Choose forgery {card.option}</button></article>)}</div>}
            <p>Study the photograph. Your drawing starts in the next phase.</p><Countries countries={view.public.countries} selected={null} />
          </>}
          {view.phase === 'Sketch' && <DrawingEditor {...access} />}
          {(view.phase === 'Gallery' || view.phase === 'Verdict') && <BallotEditor key={view.phase} {...access} />}
          {view.phase === 'Interrogate' && <><h3>Question the stories</h3><p>Talk together. Compare what people drew with what they claim happened.</p><p>{view.public.evidence ? 'The shared records are now available below.' : 'The shared records will appear 25 seconds into this phase.'}</p><p>Your initial choices are frozen. You will make a fresh final verdict next.</p></>}
          {(view.phase === 'Solution' || view.phase === 'Complete') && <p>The full reveal is below. Everyone remains in the case.</p>}
        </section>
      </div>
      <Evidence view={view} /><Gallery view={view} /><Reveal view={view} />
    </>}
  </div>;
}
