# QILSRP App

A communications platform for the Queensland Indigenous Land and Sea Rangers Program (QILSRP): resource sharing, events, group messaging, and user/cohort administration.

## Repository layout

| Folder | What it is |
|---|---|
| `server/` | Node.js / Express REST API (MySQL via Knex, JWT auth, S3 for file storage). API docs are served at `http://localhost:3000/` when the server is running. |
| `client/` | React + Vite front end (built by Team 182). |
| `legacy-client/` | Original plain JavaScript front end (built by Team 184), kept for reference. |

## Running locally

Requires [Node.js](https://nodejs.org).

**Backend**
```bash
cd server
cp .env.example .env     # then fill in the values
npm install
npm start                # http://localhost:3000
```

**Frontend (React)**
```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

The React client currently calls the API at `http://localhost:3000` (hardcoded in several files under `client/src/`). When hosting the front end and back end separately, those URLs need to point at the deployed API.

## Configuration

All secrets live in `server/.env`, which is git-ignored. `server/.env.example` lists every variable the server needs: the JWT signing secret, the MySQL connection details, and the S3 bucket and AWS credentials.

## Database

MySQL. Tables include `user`, `cohort`, `event`, `event_member`, `folder`, `resource`, `conversation`, `conversation_member` and `message`. The schema is not created automatically; it must exist in the target database.

## Credits

- **Team 184** - backend API and original front end
- **Team 182** - React front end
