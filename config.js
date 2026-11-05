/* Site configuration — edit these values, nothing else needs to change.
   Everything here is public: never put a client secret or API key in this file. */
window.MCMODS_CONFIG = {
  // Shown on the account page and used for the "email the owner" fallback.
  ownerEmail: "hiromand00@gmail.com",

  // Base URL of the OAuth/submissions backend (worker.js). Leave empty on plain
  // static hosting: the account page then offers the GitHub/email path instead.
  authBase: "",

  // Optional: "owner/repo" — turns the submission form into a prefilled GitHub
  // issue so the owner can review and close it without any backend.
  submissionsRepo: "",

  // Only used by the backend (env vars); listed here for documentation.
  providers: { google: true, microsoft: true, github: true },
};
