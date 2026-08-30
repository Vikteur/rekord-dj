/**
 * The API's types.
 *
 * Every type here is an alias for a schema in `src/api/schema.d.ts`, generated
 * from `rekord-contract`. These used to be hand-copied from the Python models
 * and kept in sync by eye across three repos, which is how this app came to
 * ship a `ScanStatus.library` the server
 * had stopped sending: `useScanPolling` waited on a field that never arrived,
 * so the library summary silently never refreshed after a scan. That whole
 * class of bug is now a compile error.
 *
 * Regenerate with `npm run types` after the contract changes.
 */

import type { components } from './api/schema'

type S = components['schemas']

// --- the library ------------------------------------------------------------

export type LibraryTrack = S['LibraryTrack']
export type Source = S['Source']
export type LibraryInfo = S['LibraryInfo']
export type LibrarySummary = S['LibrarySummary']
export type ScanReport = S['ScanReport']
export type ScanStatus = S['ScanStatus']
export type XmlImportResult = S['XmlImportResult']
export type PlaylistInfo = S['PlaylistInfo']
export type PlaylistImportResult = S['PlaylistImportResult']

/**
 * A playlist fetched from Spotify — the thing being matched.
 *
 * Not to be confused with `PlaylistInfo`, which is a rekordbox playlist already
 * imported into the library. The two have lived under adjacent names in this
 * app from the start.
 */
export type Playlist = S['SpotifyPlaylist']

// --- matching ---------------------------------------------------------------

export type PlaylistTrack = S['PlaylistTrack']
export type VersionInfo = S['VersionInfo']
export type ScoredCandidate = S['ScoredCandidate']
export type MatchResult = S['MatchResult']
export type MatchResponse = S['MatchResponse']
export type Preference = S['Preference']

// --- accounts ---------------------------------------------------------------

export type Me = S['Me']
export type UserAccount = S['UserAccount']
export type Invite = S['Invite']
export type Role = S['Role']

// --- the couple's lists -----------------------------------------------------

export type ListKind = S['ListKind']
export type SongListCode = S['SongListCode']
export type StartPref = S['StartPref']
export type SongEntry = S['SongEntry']
export type BlockEntry = S['BlockEntry']
export type CoupleChange = S['CoupleChange']
export type SongListSummary = S['SongListSummary']
export type SongListWithEntries = S['SongListWithEntries']
export type PortalLink = S['PortalLink']
export type PortalLinks = S['PortalLinks']
export type Wedding = S['Wedding']
export type WeddingSummary = S['WeddingSummary']

/**
 * This app's name for a song on one of the six lists. The contract calls it
 * `SongEntry`; the alias keeps the existing call sites compiling.
 */
export type CoupleEntry = SongEntry

// Nothing hand-written is left. Every type above comes from the contract.
