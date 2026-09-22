// Vercel's serverless entry point. The workspace build creates the bundled
// Express app before Vercel packages this function.
export { default } from "../artifacts/api-server/dist/app.mjs";