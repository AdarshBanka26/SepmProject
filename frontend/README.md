# Developer Testing Frontend

Lightweight React tester for the Grand Gallery of Wonders backend.

## Base URL Configuration

1. Copy [frontend/.env.example](frontend/.env.example) to `frontend/.env`.
2. Set `VITE_API_BASE_URL` to your backend server, for example `http://localhost:5000`.
3. Start the frontend with `npm install` in `frontend/`, then `npm run dev`.

## What It Tests

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/works`
- `GET /api/users/:id/dashboard`
- `POST /api/works/:id/like`
- `POST /api/works/:id/similarity`

The bottom console prints the raw parsed JSON from every request using formatted output.
