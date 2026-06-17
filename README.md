# Budget Tracker (Helper)

Personal finance app — track income and expenses.

## Stack
Node.js, Express, EJS, PostgreSQL, Passport (local + Google OAuth)

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in values
4. Create the database and run `queries.sql`
5. `npm start`
6. Open http://localhost:3000

## Routes
- `/` — home (redirects to login or dashboard)
- `/login`, `/register` — auth
- `/dashboard` — main app (requires login)
- `/auth/google` — Google sign-in

## Google OAuth setup
- Create OAuth credentials in Google Cloud Console
- Authorized redirect URI: `http://localhost:3000/auth/google/callback`

## Database
Run `queries.sql` in PostgreSQL to create `users` and `transactions` tables.