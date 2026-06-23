# process-dash-frontend

React frontend for Process Dash. Currently contains a single active build under `beta/`.

## Structure

```
beta/    Active frontend (React 19 + TypeScript + Vite + Tailwind CSS)
```

The `beta/` subdirectory is the working frontend. See `beta/README.md` for Vite scaffold notes, or below for the full picture.

## beta/

### Stack

- React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `Today.tsx` | Daily intent and block logging |
| `/day/:date` | `DayView.tsx` | Day rollup view for any date |
| `/week` | `WeekView.tsx` | Week-at-a-glance summary |
| `/weekend-summary` | `WeekendSummary.tsx` | End-of-week reflection |
| `/activity` | `Activity.tsx` | Raw activity log |
| `/todos` | `Todos.tsx` | Todo list |
| `/sprints` | `SprintSummaries.tsx` | All sprint summaries |
| `/projects` | `ProjectsDashboard.tsx` | Projects overview |
| `/projects/:id` | `ProjectDataView.tsx` | Per-project data |
| `/projects/:id/config` | `ProjectConfig.tsx` | Project configuration |

### API

All requests go through `src/api/client.ts`. The base URL defaults to `/api` and can be overridden with the `VITE_API_BASE` environment variable.

### Setup

```bash
cd process-dash-frontend/beta
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # production build to dist/
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE` | Backend API base URL | `/api` |
