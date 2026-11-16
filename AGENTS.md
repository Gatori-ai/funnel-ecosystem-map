# Funnel & Ecosystem Map: instructions for the agent

Brought to you by [Gatori.ai](https://gatori.ai).

**Start here.** Two kinds of work happen in this folder. Pick yours:

| You were asked to | Read |
|---|---|
| Draw or change a map of someone's funnel or business | "Making a map for someone" |
| Change this project's code, look or docs | "Working on the code" |

## What this is

A browser app that shows a business as cards and arrows on a canvas. A person describes the business, an AI function returns a map, and the person edits it by hand or by asking for changes. The app is a React and React Flow front end built with Vite, plus two Netlify Functions.

## Making a map for someone

You can build a map in conversation and hand it over as a file. The person imports it with the Import button.

1. Ask what the business does, who it serves, how people first find it, what they are offered, and what happens after they buy. One question at a time.
2. Write the map as JSON in the format below. Save it as a `.json` file.
3. Tell them: open the app, press Import, choose the file.
4. For a change, ask them to Export JSON, edit that file, and have them import it again. Keep every `id` they already have, so their manual edits survive.

The format, checked by `server/schema.js`:

```json
{
  "title": "up to 120 characters",
  "nodes": [
    { "id": "letters-digits-_-", "label": "up to 100", "kind": "offer", "description": "up to 600", "owner": "up to 80, or empty", "status": "idea" }
  ],
  "edges": [
    { "id": "e1", "source": "a node id", "target": "a node id", "label": "up to 100, or empty" }
  ]
}
```

- `kind` is one of: `audience`, `content`, `capture`, `nurture`, `offer`, `delivery`, `team`, `system`.
- `status` is one of: `idea`, `building`, `live`. A plan someone just described is `idea` until they say otherwise.
- At most 60 nodes and 120 edges. Node ids are unique. Every edge points at ids that exist.
- Never invent prices, owners, numbers or web addresses. Leave `owner` empty when you were not told.
- Arrows run in the direction a person or a piece of work moves.

## Working on the code

| Path | What it is |
|---|---|
| `src/main.jsx` | The whole interface in one file: state, the canvas, the tools panel, the inspector |
| `src/graph.js` | The starter map, category colors, Dagre layout, conversion between canvas and model |
| `src/style.css` | All styles. Colors are the Gatori Ink palette; add no new ones |
| `server/schema.js` | `validateGraph` and the JSON schema the model must follow. Used by the browser and the function |
| `server/auth.js` | Signed tickets and the `map_session` cookie |
| `netlify/functions/generate.js` | `POST /api/generate`: checks the origin and either a personal key or signed session, calls the model, validates the answer |
| `netlify/functions/session.js` | `GET /api/session`: trades a launch ticket for a session, and reports status |
| `scripts/unlock.mjs` | `npm run unlock`: opens the site with a five-minute signed link, read from `.access.json` |
| `public/about.html` | The about page. Plain HTML, no scripts |
| `netlify.toml` | Build, headers and the content security policy |
| `assets/` | Banners and the demo GIF. Sources in `assets/src/` |

Rules for changes:

- `npm run build` must pass. `npm run dev` serves the editor; the AI needs the Netlify CLI's local development mode or a deploy.
- Never commit `.access.json` or any `.env` file. Never hard-code a provider key in client code. A user-supplied key is held in memory only and sent to the same-origin function for that request; never persist or log it.
- The content security policy allows scripts, fonts and connections from this site only. A font or script from another host will be blocked; ship it in `public/` or do without.
- Anything the model returns goes through `validateGraph` before use. Keep map text out of `dangerouslySetInnerHTML`.
- HTML files are ASCII with entities.
- A change to the map's shape is made in `server/schema.js` first, then in `src/graph.js`, then in the README and in this file.
