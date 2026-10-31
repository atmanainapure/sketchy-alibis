import { gameActionSchema, type GameAction, type GameRequest } from '../shared/game';
import type { GameReply, GameView } from '../shared/game-view';

export interface CaseState { caseView: GameView | null; caseReceivedAt: number; gameBusy: boolean; gamePending: boolean; gameMessage: string }
export interface CaseControls { act(action: GameAction): Promise<boolean>; retry(): Promise<boolean>; read(): Promise<void> }
const errors: Record<string, string> = {
  INVALID_REQUEST: 'This change was not saved. Check the caption, reason and drawing limits.',
  STALE_REVISION: 'A newer version was already saved. Review the accepted version before trying again.',
  PHASE_ENDED: 'Phase ended. Only the server-accepted work counts.', LOCKED: 'Your sketch is locked.',
  EMPTY_DRAWING: 'Add a mark before submitting.', ACTION_NOT_AVAILABLE: 'That action is not available in this phase.',
  TRY_LATER: 'Too many requests. Wait before trying again.', CASE_INTERRUPTED: 'Case interrupted; results unavailable',
};
type Membership = { roomCode?: string; generation?: number; epoch: number; writable: boolean };
type Emit = (event: string, payload: unknown) => Promise<GameReply | null>;
const phases = ['Inspect', 'Sketch', 'Gallery', 'Interrogate', 'Verdict', 'Solution', 'Complete', 'Aborted'];

export class CaseChannel implements CaseControls {
  private view: GameView | null = null;
  private pending: GameRequest | null = null;
  private busy = false;
  constructor(private emit: Emit, private membership: () => Membership, private update: (state: Partial<CaseState>) => void) {}

  receive(view: GameView) {
    const old = this.view;
    if (old?.caseId === view.caseId && (view.snapshotRevision < old.snapshotRevision || view.serverTime < old.serverTime || phases.indexOf(view.phase) < phases.indexOf(old.phase) ||
      view.self.drawing.revision < old.self.drawing.revision || view.self.initial.revision < old.self.initial.revision || view.self.final.revision < old.self.final.revision)) return;
    this.view = view; this.update({ caseView: view, caseReceivedAt: performance.now() });
  }
  clear() { this.view = null; this.pending = null; this.busy = false; this.update({ caseView: null, gameBusy: false, gamePending: false, gameMessage: '' }); }

  async read() {
    const membership = this.membership();
    if (!membership.roomCode || !membership.writable) return;
    const reply = await this.emit('game:read', { roomCode: membership.roomCode });
    if (this.membership().epoch !== membership.epoch) return;
    if (reply?.view) this.receive(reply.view);
  }

  private reconciled(request: GameRequest) {
    const view = this.view;
    if (!view || view.caseId !== request.caseId) return false;
    const action = gameActionSchema.parse(request.action);
    if (action.type === 'choose-forgery') return view.self.forgery?.selected === action.option;
    if (action.type === 'save-drawing' || action.type === 'submit-drawing') {
      const drawing = view.self.drawing;
      return drawing.revision === action.expectedRevision + 1 && drawing.caption === action.caption &&
        JSON.stringify(drawing.strokes) === JSON.stringify(action.strokes) && (action.type !== 'submit-drawing' || drawing.lockMode === 'submitted');
    }
    const ballot = action.type === 'save-initial' ? view.self.initial : view.self.final;
    return ballot.revision === action.expectedRevision + 1 && ballot.country === action.country && ballot.suspectId === action.suspectId &&
      (action.type !== 'save-final' || ballot.reason === action.reason);
  }

  private async send(request: GameRequest) {
    const membership = this.membership();
    if (this.busy || !membership.writable || membership.generation !== request.generation) return false;
    this.pending = request; this.busy = true; this.update({ gameBusy: true, gamePending: false, gameMessage: '' });
    const reply = await this.emit('game:action', request);
    if (this.membership().epoch !== membership.epoch) {
      if (this.pending === request) { this.busy = false; this.update({ gameBusy: false, gamePending: true }); }
      return false;
    }
    if (reply?.view) this.receive(reply.view);
    // Receipts contain no stale snapshot. Read the current authorized view, including
    // any boundary crossed while the ACK was in flight or deliberately lost.
    await this.read();
    if (this.membership().epoch !== membership.epoch) {
      if (this.pending === request) { this.busy = false; this.update({ gameBusy: false, gamePending: true }); }
      return false;
    }
    this.busy = false;
    const accepted = reply?.ok === true || (!reply && this.reconciled(request));
    if (reply || accepted) this.pending = null;
    this.update({ gameBusy: false, gamePending: !!this.pending, gameMessage: accepted ? '' : reply && !reply.ok ? errors[reply.error] ?? 'This change was not accepted. Refresh the case to check your session.' : 'Unconfirmed change. Retry to check whether it was accepted.' });
    return accepted;
  }

  async act(action: GameAction) {
    const membership = this.membership(), parsed = gameActionSchema.safeParse(action);
    if (!this.view || !membership.roomCode || !membership.generation || !parsed.success || this.pending) return false;
    return this.send({ roomCode: membership.roomCode, generation: membership.generation, caseId: this.view.caseId, requestId: crypto.randomUUID(), action: parsed.data });
  }
  async retry() { return this.pending ? this.send(this.pending) : false; }
}
