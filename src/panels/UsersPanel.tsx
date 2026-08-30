/** Admin-only: hand out and manage DJ logins.
 *
 * Every DJ gets exactly one account, made here (there is no sign-up). The
 * admin row is shown for completeness but can't be disabled or deleted —
 * the server refuses, so the buttons aren't offered.
 */
import { useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import type { UserAccount } from '../types';
import { Panel } from './Panel';

const message = (error: unknown) =>
  error instanceof ApiError ? error.message : String(error);

export function UsersPanel() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // which action runs
  /*
    The invite link, shown once.

    It is in the response that created it and nowhere else — not recoverable,
    by design, because a link that can be re-read is a second copy of a
    credential sitting in a database. If the planner loses it they issue
    another, which invalidates this one.
  */
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
    api
      .users()
      .then((data) => setUsers(data.users))
      .catch((err: unknown) => setError(message(err)));
  }, []);

  async function run(label: string, action: () => Promise<{ users: UserAccount[] }>) {
    setBusy(label);
    setError('');
    try {
      setUsers((await action()).users);
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  /**
   * Invite a DJ.
   *
   * Replaces creating the account with a password the planner typed — which
   * meant the planner knew it, and the DJ could never be the only person who
   * did. The invite link lets them set their own.
   */
  async function invite() {
    setBusy('invite');
    setError('');
    setInviteLink(null);
    try {
      const created = await api.inviteUser(username.trim(), displayName.trim());
      setInviteLink(created.accept_url ?? null);
      setUsername('');
      setDisplayName('');
      setUsers((await api.users()).users);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove(target: UserAccount) {
    const sure = window.confirm(
      `Delete the account ${target.email}?\n\nTheir couples and libraries stay, ` +
        'unowned — you can hand them to another DJ afterwards.',
    );
    if (!sure) return;
    await run(`delete-${target.id}`, () => api.deleteUser(target.id));
  }

  return (
    <Panel
      title="DJ accounts"
      subtitle="One login per DJ — each sees the weddings they are assigned to, and their own library."
    >
      <section className="panel-section">
        <h3 className="panel-section-title">Invite a DJ</h3>
        <div className="stack">
          <input
            className="input"
            type="email"
            placeholder="their email — the invite goes here"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            className="input"
            placeholder="e.g. Sarah V. — shown in the app"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="field-row">
          <button
            className="btn btn-primary"
            title="Create a single-use link for this DJ to set their own password"
            disabled={!username.trim() || busy !== null}
            onClick={invite}
          >
            {busy === 'invite' ? 'Inviting…' : 'Create invite link'}
          </button>
        </div>
        {inviteLink && (
          <div className="list-block">
            <p className="hint">
              Send them this link. It is shown once and cannot be looked up again —
              issue another if it goes astray.
            </p>
            <input
              className="input"
              readOnly
              value={inviteLink}
              onFocus={(event) => event.target.select()}
            />
          </div>
        )}
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">Accounts</h3>
        <div className="list">
          {users.map((account) => (
            <div key={account.id} className="list-block">
              <div className="list-row">
                <span className="list-main">
                  <strong>{account.display_name}</strong>
                  <span className="muted"> · {account.email}</span>
                  {account.role === 'PLANNER' && <span className="muted"> · planner</span>}
                  {account.status === 'DISABLED' && <span className="warn"> · disabled</span>}
                  {account.status === 'INVITED' && (
                    <span className="muted"> · invited, not signed in yet</span>
                  )}
                </span>
                {account.role !== 'PLANNER' && (
                  <span className="field-row">
                    {/*
                      No "reset password" any more. The planner setting a DJ's
                      password meant the planner knew it; a DJ who is locked out
                      gets a fresh invite instead, and remains the only person
                      who knows their own password.
                    */}
                    <button
                      className="btn btn-ghost btn-sm"
                      title={
                        account.status === 'DISABLED'
                          ? 'Let this DJ sign in again'
                          : 'Block sign-in and end their session'
                      }
                      onClick={() =>
                        void run(`disable-${account.id}`, () =>
                          api.updateUser(account.id, {
                            status: account.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED',
                          }),
                        )
                      }
                    >
                      {account.status === 'DISABLED' ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Remove the account (their couples and libraries stay)"
                      onClick={() => void remove(account)}
                    >
                      Delete
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      {error && <p className="error">{error}</p>}
    </Panel>
  );
}
