# DistribuTrack Frontend Preview

## Reproduce uncommitted artifacts

No special artifacts needed. The `frontend/node_modules` directory is already present from the main checkout.

## Run the server

```bash
cd frontend
npx vite --port 5173
```

The Vite dev server serves the React frontend on `http://localhost:5173`.

**Note:** The backend (Spring Boot + MySQL) is not started here. API calls from the frontend will fail, but all UI pages, routing, forms, and component rendering are fully visible.
