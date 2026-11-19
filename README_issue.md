# ByteBill Troubleshooting & Recovery Guide

*A practical reference for future Admin Panel and API issues*

## Purpose

Use this guide to diagnose problems methodically before changing code, restarting services, or touching database records. Start with evidence from the browser and backend.

## 1. Your local development setup

These are the project locations and ports used during the recent ByteBill troubleshooting session. Update them if your setup changes.

| Component | Current location / value |
|---|---|
| Backend project | `/Users/shreya/Documents/Shreya/RiceStationApp/Backend/API/rice-station-api` |
| Admin Panel project | `/Users/shreya/Documents/Shreya/RiceStationApp/AdminPanel/bytebill-admin` |
| Backend API | `http://localhost:5001/api/v1` |
| Backend port | `5001` |
| Frontend ports seen | `3000` and `3001` — check which one is active |
| Database | Local PostgreSQL database: `rice_station` |

## 2. Standard troubleshooting workflow

Follow these steps in order. Do not start by editing code.

1. Reproduce the problem. Note the page, action, time, and exact message.
2. Open browser Developer Tools with **Command + Option + I**. Select **Network → Fetch/XHR**.
3. Refresh the page or repeat the action. Select the failed request.
4. Record the **Request URL**, **HTTP status**, and complete **Response**. Check Headers and Payload if relevant.
5. Check the backend terminal at the same time for errors or stack traces.
6. Trace the request through the frontend API call → backend route → middleware → controller/service → database query, as needed.
7. Make one targeted change at a time. Avoid unrelated refactoring during diagnosis.
8. Run the appropriate checks/build, restart only the relevant service, and retest the same request.
9. Confirm the result in the browser and test related features.

## 3. Common HTTP errors

| Status | Usually indicates | First checks |
|---|---|---|
| **401 Unauthorized** | Missing, invalid, expired, or revoked token. | Authorization header, login state, token expiry, auth logs. |
| **403 Forbidden** | User is authenticated but access is denied. | Database role, `requireRole` middleware, outlet access checks, active status. |
| **404 Not Found** | Requested URL or route is not registered. | Request URL, route mount path, HTTP method, route order. |
| **500 Internal Server Error** | Unhandled backend failure. | Backend stack trace, controller, Prisma/database errors, validation. |
| **200 but wrong data** | Request succeeded but filters, permissions, or mapping may be wrong. | Response JSON, query filters, date/time range, frontend mapping. |

## 4. Backend commands (Mac)

### Go to the backend project

```bash
cd "/Users/shreya/Documents/Shreya/RiceStationApp/Backend/API/rice-station-api"
```

### Check which process is using port 5001

```bash
lsof -nP -iTCP:5001 -sTCP:LISTEN
```

If a process is listed, note its actual PID (the number in the PID column). Stop only the process you have confirmed is the old backend:

```bash
kill <PID>
```

Replace `<PID>` with the actual number in the PID column. Do not type the word `PID`.

### Check frontend ports 3000 and 3001

```bash
lsof -nP -iTCP:3000 -iTCP:3001 -sTCP:LISTEN
```

### Check backend processes

```bash
ps aux | grep -E 'tsx watch|node.*server' | grep -v grep
```

### Start backend in development mode

```bash
npm run dev
```

This runs `src/server.ts` using `tsx watch`. Use this mode while actively changing backend TypeScript source.

### Build and start the compiled backend

```bash
npm run build
npm start
```

The build compiles TypeScript from `src` into `dist`. `npm start` runs `node dist/server.js`. Rebuild after source changes when using compiled mode. Ensure only one backend process is listening on port `5001`.

## 5. Frontend checks

Go to the Admin Panel project:

```bash
cd "/Users/shreya/Documents/Shreya/RiceStationApp/AdminPanel/bytebill-admin"
```

- Check the browser address bar: `localhost:3000` or `localhost:3001`.
- Check which process listens on each port using the `lsof` command above.
- Confirm the frontend API base URL is the intended one (currently expected: `http://localhost:5001/api/v1`).
- After frontend changes, restart the correct Next.js development server if needed.
- Hard-refresh after restart. If data still looks stale, inspect the Network response before clearing caches.

## 6. Finding the source of an error

Search the backend source for the exact message returned by the API:

```bash
grep -Rni "PASTE EXACT ERROR MESSAGE HERE" src
```

Find middleware imports:

```bash
grep -Rni "auth.middleware" src
```

Inspect a known source file:

```bash
cat src/middleware/auth.middleware.ts
```

Use the exact file and line identified by the search. Do not assume the first matching file is the one currently running.

## 7. TypeScript source vs compiled JavaScript

| Mode | Command | What runs |
|---|---|---|
| Development | `npm run dev` | `src/server.ts` via `tsx watch` |
| Compiled | `npm start` | `dist/server.js` via Node |

A source-code fix does not update an already-running compiled server. If you run `npm start`, rebuild with `npm run build` and restart the process. Do not manually edit files inside `dist`; they are generated output.

If both `.ts` and `.js` files exist in `src`, inspect imports and the running process before removing or renaming anything. Never delete files just because they look duplicated.

## 8. Case study: the Super Admin outlet error

**Symptom:** Dashboard and Outlet Management displayed:

> No active outlet is assigned to this account.

The Network tab showed a `403` response from the outlets API.

The source TypeScript authentication middleware already had a Super Admin exception allowing `SUPER_ADMIN` to continue with `outletId` set to `null`. The backend was running a compiled build. Rebuilding with `npm run build` regenerated `dist/middleware/auth.middleware.js` with the exception.

**Verified outcome:** The dashboard displayed platform totals and the outlet overview again.

The diagnostic pattern was to inspect the API response, inspect source and compiled code, identify the running process, rebuild, restart, and retest.

Do not copy this exact fix blindly into another incident. First verify the current response, code, user role, and process.

## 9. Safe working rules

- Do not delete database records or run destructive SQL to fix a UI or permission error.
- Do not change production/VPS services when the issue is only in local development.
- Never share passwords, JWT secrets, API tokens, private keys, or complete `.env` files.
- Do not manually edit `dist` output; change TypeScript source and rebuild.
- Do not run two backend servers on port `5001`. Check the listener before starting another process.
- Keep changes small and focused. Save a working state in Git before risky changes.
- After a fix, test related functions such as login, dashboard, outlet list, outlet edit, and menu access.

## 10. Incident notes template

Copy this section into a note whenever a new issue occurs.

| Field | Notes |
|---|---|
| Date/time | |
| Page / feature | |
| What I did before the error | |
| Exact error message | |
| Request URL + method | |
| HTTP status | |
| Network Response | |
| Backend terminal error | |
| Frontend port / backend PID | |
| Files inspected | |
| Change made | |
| Build / restart performed | |
| Retest result | |
| Git commit / backup reference | |

---

*End of guide*
