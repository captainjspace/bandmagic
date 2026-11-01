/** The caller's email: Cloud Run / IAP header in prod, LOCAL_USER_EMAIL in dev. */
export function userEmail(headers: Headers): string | null {
  return (
    headers
      .get("x-goog-authenticated-user-email")
      ?.replace("accounts.google.com:", "") ??
    process.env.LOCAL_USER_EMAIL ??
    null
  );
}
