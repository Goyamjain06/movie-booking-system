# CineVerse frontend

React 19 (Create React App) · Tailwind CSS · Framer Motion · React Router 7.

```bash
cp .env.example .env.local   # point REACT_APP_API_URL at your API
npm install
npm start                    # http://localhost:3000  (use PORT=3001 if the API runs on 3000)
npm run build                # production build -> build/
```

Structure: `src/pages` (route screens), `src/components` (UI building blocks, chat widget, splash),
`src/state` (auth / toast / chat context), `src/api.js` (typed-ish API client), `src/lib/format.js`.
The product name and city live in `src/config.js`.
