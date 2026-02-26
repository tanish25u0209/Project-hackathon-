# Frontend Integration Guide (Google Drive File Backend)

This document explains everything a frontend developer needs to connect to this backend.

---

## 1) What this backend provides

Base URL (local):
- `http://localhost:8000`

Available endpoints:
- `GET /health` → backend liveness check
- `POST /upload` → upload one file to Google Drive
- `GET /file/:fileId` → download/stream file from Google Drive
- `GET /file/:fileId/meta` → fetch file metadata only

Current behavior:
- Upload expects **multipart/form-data** with field name exactly: `file`
- Upload returns Drive file info including `id`
- Download returns binary stream with download headers
- Metadata returns JSON object with file details

---

## 2) Backend auth modes (important for frontend expectations)

Configured in `.env` via `GOOGLE_AUTH_MODE`:
- `oauth2` (currently used)
- `service_account`
- `auto`

Current project is set up to use OAuth2 for Drive access. Frontend does **not** send Google tokens to this backend for these routes; backend uses its own server-side credentials.

---

## 3) Endpoint contracts

### 3.1 Health check

**Request**
```http
GET /health
```

**Success response (200)**
```json
{
  "status": "ok",
  "timestamp": "2026-02-25T15:57:40.119Z",
  "service": "gdrive-large-file-backend"
}
```

Frontend use:
- Check API availability on app startup
- Show "Backend offline" banner if unavailable

---

### 3.2 Upload file

**Request**
```http
POST /upload
Content-Type: multipart/form-data
```
Form fields:
- `file`: binary file (required)

**Success response (201)**
```json
{
  "message": "File uploaded successfully.",
  "file": {
    "id": "1g85tD9ME2TIuSpQcOvdV61fvqEq4K7Z0",
    "name": "test_file.txt",
    "mimeType": "text/plain",
    "webViewLink": "https://drive.google.com/file/d/.../view?usp=drivesdk",
    "createdTime": "2026-02-25T15:57:41.616Z",
    "size": "44"
  }
}
```

**Common error responses**
- `400` → wrong content type / missing file field
- `401` → auth with Drive failed
- `403` → Drive permission issue
- `429` → Drive API quota limit
- `500` → server error

---

### 3.3 Download file

**Request**
```http
GET /file/:fileId
```

**Success response (200)**
- Body: binary stream
- Headers include:
  - `Content-Type`
  - `Content-Disposition: attachment; filename="..."`
  - `Content-Length` (if available)

**Common error responses**
- `404` if file does not exist or inaccessible

---

### 3.4 File metadata

**Request**
```http
GET /file/:fileId/meta
```

**Success response (200)**
```json
{
  "id": "...",
  "name": "...",
  "mimeType": "...",
  "webViewLink": "...",
  "createdTime": "...",
  "modifiedTime": "...",
  "size": "..."
}
```

---

## 4) Frontend code examples

## 4.1 Upload (browser `fetch`)

```js
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('http://localhost:8000/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Upload failed');
  }

  return data.file; // has id, name, size, etc.
}
```

## 4.2 Metadata fetch

```js
async function getFileMeta(fileId) {
  const res = await fetch(`http://localhost:8000/file/${fileId}/meta`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Meta fetch failed');
  return data;
}
```

## 4.3 Download trigger in browser

```js
function downloadFile(fileId) {
  const url = `http://localhost:8000/file/${fileId}`;
  window.open(url, '_blank');
}
```

Alternative for controlled blob download:

```js
async function downloadFileAsBlob(fileId, filename = 'download') {
  const res = await fetch(`http://localhost:8000/file/${fileId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Download failed');
  }

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
```

---

## 5) Suggested frontend flow

1. On app load, call `GET /health`
2. User selects file
3. Upload with `POST /upload`
4. Save returned `file.id` in frontend state/DB
5. Use `GET /file/:fileId/meta` for list/details page
6. Use `GET /file/:fileId` for download action

---

## 6) Error handling contract for frontend

Backend standard error format:
```json
{ "error": "Human-readable message" }
```

Recommended UI mapping:
- `400`: show validation/help message
- `401`: show "server auth misconfigured"
- `403`: show "permission denied"
- `404`: show "file not found"
- `429`: show retry with backoff
- `500+`: show generic failure + retry option

---

## 7) Integration checklist

Before frontend integration, verify:
- Backend starts with `npm start`
- `.env` has valid Drive credentials
- `GET /health` returns `status: ok`
- Upload works via `curl` once
- You can download uploaded file with returned `fileId`

---

## 8) CORS / deployment note

Current backend does not explicitly enable CORS middleware.

If frontend runs on a different origin (for example `http://localhost:3000` while backend is on `http://localhost:8000`), browser calls may fail due to CORS.

Options:
- Serve frontend and backend from same origin via reverse proxy
- Add CORS middleware in backend (`cors` package)

---

## 9) Current API gaps (if frontend needs full file management)

Not yet implemented as backend routes:
- Delete file endpoint (e.g. `DELETE /file/:fileId`)
- Rename/update metadata endpoint
- Replace content while keeping same `fileId`
- List files endpoint

A frontend can still do upload/download/meta now. If you need full file manager UX, add those backend endpoints first.

---

## 10) Quick test commands for frontend developers

```bash
# Health
curl -s http://localhost:8000/health | jq

# Upload
curl -s -X POST http://localhost:8000/upload -F "file=@./Capture.PNG" | jq

# Metadata
curl -s http://localhost:8000/file/<FILE_ID>/meta | jq

# Download
curl -L http://localhost:8000/file/<FILE_ID> -o downloaded-file
```

---

## 11) Security note

Never commit real secrets in `.env` to Git.
Rotate/revoke exposed credentials immediately if shared publicly.
