# Camera Gear Checklist — Production Prep Slate

A dark, production-focused checklist for camera departments. Build per-project gear lists, track what you have, what you're looking for, and what's still to be confirmed, then export a clean PDF for the rental house or crew.

## What it does

- **Project-first**: set up a project with dates, type, and contacts.
- **Category checklists**: cameras, lenses, filters, support, media, power, and more.
- **Smart gear picker**: start typing a brand/series and pick exact focal lengths, filter grades, or configurations.
- **Status tracking**: mark each item as Have, Looking, or TBC.
- **Collapsible sections**: focus on the category you're working on.
- **PDF export**: print a clean, printable slate with the current state.
- **Local persistence**: all data lives in `localStorage` so it survives reloads.

## Tech stack

- [TanStack Start](https://tanstack.com/start) — full-stack React framework
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [shadcn/ui](https://ui.shadcn.com/) components

## Development

```sh
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build

# Lint and format
npm run lint
npm run format
```

## Project structure

```
src/
  components/checklist/    # Checklist UI components
  data/gear.ts             # Gear database, families, and color helpers
  lib/checklist-store.ts   # State management and localStorage persistence
  lib/dates.ts             # Date formatting and range helpers
  routes/index.tsx         # Main app route
  styles.css               # Theme tokens and Tailwind config
```

## License

This project was originally built in [Lovable](https://lovable.dev) and is provided as-is for your own use and modification.
