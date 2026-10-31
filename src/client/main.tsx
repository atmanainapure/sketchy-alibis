import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLobby } from './use-lobby';
import { CaseScreen } from './case-screen';
import './style.css';

function App() {
  const lobby = useLobby();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const view = lobby.view;
  const own = view?.room.players.find(p => p.id === view.self.id);
  const owner = own?.id === view?.room.ownerId;
  const disabled = !lobby.connected || lobby.busy || lobby.pending;

  return (
    <main className={lobby.caseView ? 'playing' : ''}>
      <p className="eyebrow">A private gathering of unlikely suspects</p>
      <div className="case-sheet">
        <p className="stamp">Case file 001</p>
        <h1>Sketchy<br /><span>Alibis.</span></h1>
        <p className="tagline">Draw your story. Find the place. Catch the liar.</p>
        <p className="intro">Four friends. One suspicious story.<br />Absolutely no drawing talent required.</p>
        {lobby.message && <p role="alert" className="notice">{lobby.message}</p>}
        {lobby.pending && <button disabled={!lobby.connected || lobby.busy} onClick={() => lobby.controls.current?.retry()}>Retry pending request</button>}
        {lobby.caseView && lobby.gameControls.current && view ? <CaseScreen roomCode={view.room.code} view={lobby.caseView} receivedAt={lobby.caseReceivedAt} controls={lobby.gameControls.current} connected={lobby.connected} busy={lobby.gameBusy} pending={lobby.gamePending} message={lobby.gameMessage} /> : lobby.needsResume ? <section className="lobby-panel"><p>This browser already has a seat. Resume here to use it in this tab.</p><button disabled={disabled} onClick={() => lobby.controls.current?.resume()}>Resume here</button></section> : view ? <section className="lobby-panel">
          <h2>{view.room.status === 'Closed' ? 'Room closed' : 'Your private room'}</h2>
          <p>Share this code with your friends: <output aria-label="Room code" className="room-code">{view.room.code}</output></p>
          <p>You are {own?.name}{owner ? ' (host)' : ''}</p>
          <ul aria-label="Players" className="players">{view.room.players.map(p => <li key={p.id}>
            <span><strong>{p.name}</strong>{p.id === view.room.ownerId ? ' · Host' : ''}{p.id === view.self.id ? ' · You' : ''}<small>{p.connected ? 'Connected' : 'Disconnected'} · {p.ready ? 'Ready' : 'Not ready'}</small></span>
            {owner && p.id !== own?.id && view.room.status === 'Lobby' && <button className="secondary" disabled={disabled} onClick={() => lobby.controls.current?.act('remove', { targetId: p.id })}>Remove {p.name}</button>}
          </li>)}</ul>
          {view.room.status === 'Lobby' && <><p>{view.room.players.length}/4 players. Everyone must be connected and ready to start.</p><div className="actions">
            <button aria-pressed={own?.ready ?? false} disabled={disabled} onClick={() => lobby.controls.current?.act('ready', { ready: !own?.ready })}>Ready</button>
            {owner ? <><button disabled={disabled || view.room.players.length !== 4 || view.room.players.some(p => !p.ready || !p.connected)} onClick={() => lobby.controls.current?.act('start')}>Start case</button><button className="secondary" disabled={disabled} onClick={() => lobby.controls.current?.act('close')}>Close room and leave</button></> : <button className="secondary" disabled={disabled} onClick={() => lobby.controls.current?.act('leave')}>Leave room</button>}
          </div></>}
          {view.room.status === 'Closed' && <p>The host closed this room. No case was played.</p>}
          {view.room.status === 'Started' && <p>The case has started.</p>}
        </section> : <section className="lobby-panel" aria-label="Enter a private room">
          <label>Your name<input value={name} onChange={event => setName(event.target.value)} autoComplete="off" /></label>
          <button disabled={disabled || !name.trim()} onClick={() => lobby.controls.current?.enter('create', name, '')}>Create room</button>
          <label>Code to join<input value={code} onChange={event => setCode(event.target.value.toUpperCase())} autoComplete="off" spellCheck={false} /></label>
          <button disabled={disabled || !name.trim() || !code.trim()} onClick={() => lobby.controls.current?.enter('join', name, code)}>Join room</button>
          <p className="hint">Each player needs a separate browser profile or device. Tabs in one profile share a seat.</p>
        </section>}
        <details className="rules"><summary>How to play</summary><p>Four players investigate one fictional murder. One player secretly invents an alibi. Talk together in person or on your own call.</p><p>Inspect a photograph, then draw your card in 40 seconds. Include both required details. Use one black pen, undo and clear. An optional caption can contain up to five words and 80 characters.</p><p>Discuss the locked drawings and evidence. Privately choose a country and accuse another player. Correct country: 2 points. Innocent correct accusation: 3 points. Murderer escapes arrest: 3 points. Tied accusations mean escape. Everyone stays in the case.</p></details>
      </div>
      <p role="status" aria-live="polite" className={lobby.connected ? 'connection online' : 'connection'}>
        <span aria-hidden="true" className="dot" />
        {lobby.connected ? 'Connected to the case desk' : 'Disconnected — reconnecting…'}
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
