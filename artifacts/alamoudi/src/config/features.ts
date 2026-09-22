// Feature flags — toggle whole features on/off WITHOUT deleting any code or data.
//
// AI assistant ("المستشار الذكي"): temporarily hidden across the whole platform
// (client chat widget, navbar links, and the admin "عملاء المستشار الذكي" page
// link). All AI code, routes, leads data, and backend endpoints stay intact, so
// it can be switched back on at any time.
//
// To re-enable: set the env var VITE_AI_ASSISTANT_ENABLED=true (then redeploy),
// or simply change the default below to true.
export const AI_ASSISTANT_ENABLED =
  (import.meta.env.VITE_AI_ASSISTANT_ENABLED ?? "false") === "true";
