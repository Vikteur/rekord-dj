import { useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { formatDuration } from '../format';
import { useApp } from '../store';
import type { LoadedWedding } from '../store';
import type {
  BlockEntry,
  CoupleChange,
  CoupleEntry,
  ListKind,
  SongListWithEntries,
  WeddingSummary,
} from '../types';
import { useUi } from '../ui/UiContext';
import { Panel } from './Panel';

/** The chapters a couple fills in, in intake order, with the DJ-side labels. */
const CHAPTERS: { kind: ListKind; label: string }[] = [
  { kind: 'opening_dance', label: 'Opening dance' },
  { kind: 'second_third', label: 'Second & third song' },
  { kind: 'couple_top20', label: 'Their top 20' },
  { kind: 'friends_top20', label: "Friends' top 20" },
  { kind: 'must_plays', label: 'Must-plays' },
];

const message = (error: unknown) =>
  error instanceof ApiError ? error.message : String(error);

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function EntryLine({ entry }: { entry: CoupleEntry }) {
  return (
    <div className="list-track">
      <span className="list-track-n mono muted">{entry.position + 1}</span>
      <span className="list-main">
        {entry.artist ? `${entry.artist} – ` : ''}
        {entry.title}
        {!entry.spotify_id && <span className="muted"> · as typed</span>}
        {entry.source_token_kind === 'friend' && <span className="muted"> · friend</span>}
      </span>
      <span className="mono muted">
        {entry.duration_ms != null ? formatDuration(entry.duration_ms / 1000) : ''}
      </span>
    </div>
  );
}

function BlockLine({ entry }: { entry: BlockEntry }) {
  return (
    <div className="list-track">
      <span className="list-track-n mono muted">·</span>
      <span className="list-main">
        {entry.artist ? `${entry.artist} – ` : ''}
        {entry.title}
      </span>
    </div>
  );
}

/**
 * The DJ's window on the weddings they are playing.
 *
 * Read-only, and that is the design rather than an omission. Creating a
 * wedding, rotating the couple's link and switching it off belong to the
 * planner, who booked the couple and owns that relationship; the DJ is
 * assigned to the day and needs the music, the never list and the briefing. An
 * account holding both roles does the first set in the planner app and sees
 * the result here.
 *
 * Access follows the person named in the DJ slot, not the company they belong
 * to — being listed in the directory as a DJ is not enough to see anyone's
 * answers.
 */
export function CouplesPanel() {
  const s = useApp();
  const { panelArg, closePanel } = useUi();

  const [selectedId, setSelectedId] = useState<string | null>(
    typeof panelArg === 'string' && panelArg !== 'new' ? panelArg : null,
  );
  const [detail, setDetail] = useState<LoadedWedding | null>(null);
  const [changes, setChanges] = useState<CoupleChange[]>([]);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void s.refreshCouples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load one wedding's answers.
   *
   * The couple answers from home, so this polls while the panel is open — a DJ
   * who leaves it up during the week watches the lists fill in. Only the first
   * load shows a spinner; the refreshes are silent, because a list that blinks
   * every fifteen seconds is worse than one that quietly grows.
   */
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setChanges([]);
      setBriefing(null);
      return;
    }
    let cancelled = false;

    async function load(showBusy: boolean) {
      if (showBusy) setBusy(true);
      try {
        const [lists, feed, summary] = await Promise.all([
          api.weddingSongLists(selectedId!),
          api.weddingChanges(selectedId!),
          api.wedding(selectedId!),
        ]);
        if (cancelled) return;
        setDetail({
          id: selectedId!,
          names: summary.couple_display_name,
          lists: lists.song_lists,
          blocklist: lists.blocklist,
        });
        setBriefing(lists.briefing_text ?? null);
        setChanges(feed.changes);
        setError('');
      } catch (caught) {
        if (!cancelled) setError(message(caught));
      } finally {
        if (!cancelled && showBusy) setBusy(false);
      }
    }

    void load(true);
    const timer = window.setInterval(() => void load(false), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId]);

  const chapterOf = (kind: ListKind): SongListWithEntries | undefined =>
    detail?.lists.find((list) => list.kind === kind);

  return (
    <Panel
      title="Your weddings"
      subtitle="The weddings you are playing, and what the couple has answered so far."
    >
      {error && <div className="notice notice-warn">{error}</div>}

      {!selectedId && (
        <div className="list">
          {s.weddings.length === 0 && (
            <p className="muted">
              Nothing assigned yet. Your planner adds you to a wedding and it appears here.
            </p>
          )}
          {s.weddings.map((wedding: WeddingSummary) => (
            <button
              key={wedding.id}
              className="list-row list-row-button"
              onClick={() => setSelectedId(wedding.id)}
            >
              <span className="list-main">
                <strong>{wedding.couple_display_name}</strong>
                <span className="muted"> · {wedding.wedding_date}</span>
              </span>
              <span className="mono muted">
                {wedding.music.lists_in} of {wedding.music.lists_total} lists in
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <>
          <div className="field-row">
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId(null)}>
              ← All weddings
            </button>
            {busy && <span className="muted">Loading…</span>}
          </div>

          {detail && (
            <>
              <h3 className="panel-h">{detail.names}</h3>

              {briefing && (
                <div className="list-block">
                  <div className="mono muted">HOW THEY WANT THE NIGHT TO GO</div>
                  <p className="list-detail">{briefing}</p>
                </div>
              )}

              {CHAPTERS.map(({ kind, label }) => {
                const chapter = chapterOf(kind);
                const entries = chapter?.entries ?? [];
                return (
                  <div key={kind} className="list-block">
                    <div className="list-row">
                      <span className="list-main">
                        <strong>{label}</strong>
                        <span className="muted">
                          {' '}
                          · {entries.length}
                          {chapter?.max_songs ? ` of ${chapter.max_songs}` : ''}
                        </span>
                      </span>
                      {entries.length > 0 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Load this chapter into the match table"
                          onClick={() => {
                            s.loadCoupleChapter(detail, kind, label);
                            closePanel();
                          }}
                        >
                          Match these
                        </button>
                      )}
                    </div>
                    {entries.map((entry) => (
                      <EntryLine key={entry.uid} entry={entry} />
                    ))}
                  </div>
                );
              })}

              {detail.blocklist.length > 0 && (
                <div className="list-block">
                  <div className="list-row">
                    <span className="list-main">
                      <strong>The never list</strong>
                      <span className="muted"> · {detail.blocklist.length}</span>
                    </span>
                  </div>
                  {/*
                    Shown, never loaded into the match table. The export
                    re-checks server-side and drops these in every version of
                    the song, so a banned track cannot reach the decks even if
                    it were picked by hand.
                  */}
                  {detail.blocklist.map((entry) => (
                    <BlockLine key={entry.uid} entry={entry} />
                  ))}
                </div>
              )}

              {changes.length > 0 && (
                <div className="list-block">
                  <div className="mono muted">WHAT CHANGED</div>
                  {changes.slice(0, 12).map((change, index) => (
                    <div className="list-track" key={`${change.at}-${index}`}>
                      <span className="list-main">
                        {change.summary}
                        {/* A friend has no identity here beyond which link they used. */}
                        {change.token_kind === 'friend' && (
                          <span className="muted"> · a friend</span>
                        )}
                      </span>
                      <span className="mono muted">{timeAgo(change.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </Panel>
  );
}
