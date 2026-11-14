# Funnel & Ecosystem Map

An editable visual canvas for mapping funnels, business ecosystems, and operating plans. Add cards and connections, arrange the map, undo changes, present it, and export or import JSON. Maps and snapshots live in your browser; export backups before clearing browser data.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The canvas works without an AI account. Vite alone does not run the AI functions.

## Use it with your AI assistant

You can use ChatGPT, Claude, Codex, or another assistant without connecting it to the app:

1. Ask your assistant to create a map in the JSON format below and save it as a `.json` file.
2. In the canvas, click **Import** in the header and select that file.
3. To revise an existing map, export it, give the JSON and your requested changes to your assistant, then import the revised file. Avoid sharing sensitive business information with a service you do not trust.

Prompt to copy:

> Create a business map as JSON for Funnel & Ecosystem Map. Return an object with `title`, `nodes`, and `edges`. Each node needs `id`, `label`, `kind`, `description`, `owner`, and `status`. Kinds are audience, content, capture, nurture, offer, delivery, team, or system. Status is idea, building, or live. Use an empty string for an unknown owner. Node IDs may contain only letters, numbers, underscores, and hyphens. Each edge needs a unique `id`, `source`, `target`, and `label`; source and target must match node IDs. Use at most 60 nodes and 120 edges. Here is what I want to map: [describe your business].

Example:

```json
{
  "title": "Simple funnel",
  "nodes": [
    {"id":"content","label":"Videos","kind":"content","description":"Introduce the idea","owner":"","status":"idea"},
    {"id":"guide","label":"Free guide","kind":"capture","description":"Invite subscribers","owner":"","status":"idea"}
  ],
  "edges": [{"id":"content-guide","source":"content","target":"guide","label":"leads to"}]
}
```

## Optional built-in AI on your own Netlify site

The built-in prompt panel uses a server-side OpenAI-compatible integration and Netlify Functions. It is separate from the file-based workflow above. Deploy your own copy to Netlify, configure `MAP_ACCESS_SECRET` as a long random secret, and configure server-side `OPENAI_API_KEY` (or Netlify AI Gateway credentials). Optionally set `MAP_AI_MODEL` to a compatible model supporting strict JSON schemas; the default is `gpt-4.1-mini`. Provider usage can incur charges. Never put credentials in browser code or commit them.

To unlock your deployment, create an ignored `.access.json` in the project root with `url` set to your own HTTPS site URL and `secret` set to the same value as `MAP_ACCESS_SECRET`. Run `npm run unlock`; on macOS it opens Chrome. The short-lived link creates a 30-day browser session. Keep the secret and link private. The built-in access scheme is intended for a small trusted group, not public multi-user authentication. Review rate limits, billing and access controls before exposing your deployment.

`npm run build` creates `dist`. Netlify configuration builds the app and functions. For local function development, use the Netlify CLI and configure the same environment variables; the secure session cookie requires HTTPS, so test the complete access flow on your deployed HTTPS site.

## Limits and privacy

Maps are stored locally in the browser; there is no shared cloud storage or live collaboration. Built-in AI sends your prompt and, for updates, the current map to the configured provider; it does not send the full chat history. The app does not execute funnels. Imports are limited to 60 cards and 120 connections. Check AI-generated content before relying on it.

## License

MIT. See [LICENSE](LICENSE).
