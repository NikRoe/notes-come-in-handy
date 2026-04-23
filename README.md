# Notes Come in Handy

A minimal note-taking app built with Next.js. Write notes in Markdown, organize them with tags, search across your content, and access them offline — all synced to a database.

## Features

- Create, edit, and delete notes with Markdown support (GitHub Flavored Markdown)
- Organize notes with tags
- Full-text search across titles and content
- Dark/light mode toggle
- Offline support: notes are readable and editable without a connection
- Automatic sync when back online, with timestamp-based conflict resolution
- GitHub OAuth login via NextAuth.js

## Tech Stack

| Tool | Purpose |
| ---- | ------- |
| [Next.js 15](https://nextjs.org) (TypeScript) | Framework, routing, API routes |
| [NextAuth.js](https://next-auth.js.org) | GitHub OAuth authentication |
| [Prisma](https://prisma.io) + PostgreSQL | Database ORM |
| [SWR](https://swr.vercel.app) | Data fetching & caching |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Markdown rendering |
| [Tailwind CSS](https://tailwindcss.com) + shadcn/ui | Styling & UI components |
| [next-themes](https://github.com/pacocoursey/next-themes) | Dark/light mode |
| IndexedDB + Service Worker | Offline storage & caching |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Railway](https://railway.app) or [Supabase](https://supabase.com) free tier)
- A GitHub OAuth app ([create one here](https://github.com/settings/developers))

### Installation

```bash
git clone https://github.com/your-username/notes-come-in-handy.git
cd notes-come-in-handy
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="your-postgresql-connection-string"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
GITHUB_ID="your-github-oauth-app-id"
GITHUB_SECRET="your-github-oauth-app-secret"
```

```bash
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
