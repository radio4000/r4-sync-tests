/**
 * Codes that mean "this row does not exist", as opposed to "the query failed".
 * 404-ing a live channel because Supabase blinked would tell Google to deindex it,
 * so anything unrecognised counts as transient and must never 404.
 */
const PERMANENTLY_MISSING = new Set([
	// `.single()` matched no row. (It also covers multiple matches, which can't
	// happen here — we only ever filter on a unique column.)
	'PGRST116',
	// Postgres could not parse the value as its column type, e.g. `/oskar/tracks/1`
	// where the id column is a uuid.
	'22P02'
])

/** True when the row is known not to exist, false for any failure that might resolve on retry. */
export function isMissingRow(error: {code?: string | null} | null | undefined): boolean {
	return Boolean(error?.code && PERMANENTLY_MISSING.has(error.code))
}
