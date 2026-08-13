# StudyDesk — Student Dashboard

A single-page student dashboard for tracking courses, homework, grades, and a weekly class schedule. Built with plain HTML, Tailwind CSS (via CDN) + custom CSS, and vanilla JavaScript. All data is saved locally in the browser — no backend required.

## Features

- **Overview**
  - Term progress "ruler" showing the current week and upcoming deadlines
  - Quick stats: enrolled courses, items due this week, average grade, study streak

- **Courses**
  - Course cards with progress, grade, and next-item-due info
  - Add / edit / delete courses via a modal form (code, name, color, progress %, grade %, assignments graded/total, next item, syllabus notes)
  - Course detail modal with syllabus text and an editable file list
  - Live search that filters courses (and homework) by typed text

- **Homework**
  - Checklist of tasks with priority (low/medium/high) and status (pending/late/submitted)
  - Add new tasks with course, due date, and priority
  - Mark tasks as submitted or delete them
  - CSS-only filter chips (status + priority) using hidden radio inputs — no JS needed for filtering visibility

- **Grades**
  - Auto-generated grades table from course data, with overall average and letter grade
  - Inline editing of grades per course

- **Calendar**
  - Weekly schedule view combining recurring classes and homework due dates, grouped by day

- **Other**
  - Light/dark theme toggle
  - Reminders bell showing tasks due today/tomorrow or overdue
  - Settings modal: export all data as JSON, import a JSON backup, or reset to sample data
  - Toast notifications for actions (add/delete/save/export/import)

## Project Structure

```
├── index.html    # Page markup (dashboard layout, modals, forms)
├── style.css     # Custom styling (chalkboard/binder visual theme, animations)
└── script.js     # State management, rendering, CRUD, filters, calendar, theme, import/export
```

## Data & Persistence

- All courses, homework, and theme preference are stored in the browser's `localStorage` under the key `studydesk-v2`.
- On first load, the app seeds itself with 4 sample courses (CS201, MATH210, ENG105, PHY150) and 5 sample homework items.
- Use **Settings → Export data** to download backup, **Import data** to restore one, or **Reset to sample data** to start over.

## External Dependencies (via CDN)

- [Tailwind CSS](https://tailwindcss.com/) (Play CDN) — utility classes and the custom color/font theme
- [Google Fonts](https://fonts.google.com/) — Baloo 2, Inter, JetBrains Mono, Caveat

## Getting Started

1. Download the three files (`index.html`, `style.css`, `script.js`) into the same folder.
2. Open `index.html` in a browser — no build step or server required.
3. An internet connection is needed for the CDN assets (Tailwind, Google Fonts) to load.

## Notes

- This is a front-end-only demo app; there is no real login, and all data lives in one browser's local storage (it won't sync across devices/browsers).v
