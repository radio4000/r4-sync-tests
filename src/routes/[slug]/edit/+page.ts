// Owner-only. The `[slug]` layout guards these routes with
// `sdk.supabase.auth.getUser()`, and the session lives in localStorage — it
// never reaches the server, so a server-run guard sees nobody and redirects
// every hard load to /auth. Opting out of SSR keeps the guard in the browser.
export const ssr = false
