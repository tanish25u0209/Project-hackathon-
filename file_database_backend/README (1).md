# Google Drive Large File Backend

A production-ready Node.js/Express service that acts as a **zero-buffer streaming bridge** between clients and Google Drive. Files are never written to disk — bytes flow directly from the incoming HTTP request into the Drive API (upload), or from Drive straight back to the client (download).

---

## Architecture Overview

```
UPLOAD:   Browser ──multipart──▶ Express/Busboy ──stream──▶ Drive API (Resumable)
DOWNLOAD: Browser ◀──bytes──── Express (pipe) ◀──stream── Drive API (alt=media)
```

---

## Project Structure

```
gdrive-large-file-backend/
├── src/
│   ├── index.js                  # App entry point, server init, graceful shutdown
│   ├── driveService.js           # All Google Drive API interactions
│   ├── routes/
│   │   └── files.js              # Express route handlers (/upload, /file/:id)
│   ├── middleware/
│   │   └── errorHandler.js       # Global error handler with Drive API code mapping
│   └── utils/
│       └── googleAuth.js         # JWT Service Account auth client
├── .env.example                  # Environment variable template
├── package.json
└── README.md
```

---

## Google Cloud Console Setup

Follow these steps exactly to create credentials that work with this backend.

### Step 1 — Create or Select a Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown (top-left) → **New Project**.
3. Give it a name (e.g. `drive-backend`) and click **Create**.

### Step 2 — Enable the Google Drive API

1. In the left sidebar: **APIs & Services → Library**.
2. Search for **"Google Drive API"** → click it → **Enable**.

### Step 3 — Create a Service Account

1. **APIs & Services → Credentials → Create Credentials → Service Account**.
2. Fill in a name (e.g. `drive-uploader`) → **Create and Continue**.
3. Assign the role **Editor** (or a custom role with Drive permissions) → **Done**.

### Step 4 — Generate a JSON Key File

1. On the **Credentials** page, click your new service account.
2. Go to the **Keys** tab → **Add Key → Create new key → JSON** → **Create**.
3. A `.json` file downloads. **Keep this file secret — it grants Drive access.**

### Step 5 — Share Your Drive Folder with the Service Account

This is the most commonly missed step. The Service Account has its own Drive
and cannot see your personal folders by default.

1. In Google Drive, right-click the folder you want to use → **Share**.
2. Paste the Service Account email (e.g. `drive-uploader@project.iam.gserviceaccount.com`).
3. Set permissions to **Editor** → **Send**.
4. Copy the Folder ID from the folder's URL:
   ```
   https://drive.google.com/drive/folders/THIS_IS_YOUR_FOLDER_ID
   ```

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the values from your downloaded JSON key file:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=drive-uploader@my-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=1A2B3C4D5E6F7G8H9I0J
PORT=3000
```

> **Tip:** The private key in the JSON file uses `\n` as literal two-character
> escape sequences. You can paste it as-is inside double quotes — the auth
> helper normalises it automatically.

### 3. Run the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

---

## API Reference

### `POST /upload`

Uploads a file to the configured Drive folder using the resumable protocol.

**Request:** `multipart/form-data` with a field named `file`.

```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@/path/to/your/large-file.zip"
```

**Response `201`:**
```json
{
  "message": "File uploaded successfully.",
  "file": {
    "id": "1XYZ...",
    "name": "large-file.zip",
    "mimeType": "application/zip",
    "size": "104857600",
    "webViewLink": "https://drive.google.com/file/d/1XYZ.../view",
    "createdTime": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### `GET /file/:fileId`

Streams a file from Drive directly to the client. Triggers a browser download.

```bash
curl -OJ http://localhost:3000/file/1XYZ...
```

**Response:** Binary file stream with headers:
```
Content-Type: application/zip
Content-Disposition: attachment; filename="large-file.zip"
Content-Length: 104857600
```

---

### `GET /file/:fileId/meta`

Returns Drive metadata without downloading the file body. Useful for size
checks or building a file browser UI.

```bash
curl http://localhost:3000/file/1XYZ.../meta
```

**Response `200`:**
```json
{
  "id": "1XYZ...",
  "name": "large-file.zip",
  "mimeType": "application/zip",
  "size": "104857600",
  "webViewLink": "https://drive.google.com/file/d/1XYZ.../view",
  "createdTime": "2024-01-15T10:30:00.000Z",
  "modifiedTime": "2024-01-15T10:30:00.000Z"
}
```

---

### `GET /health`

Returns service health status. Useful for load balancer probes.

---

## Key Design Decisions

### Why Resumable Uploads?

The Drive API supports three upload types:

| Type | Max Size | Suitable For |
|------|----------|-------------|
| `simple` | 5 MB | Small files only |
| `multipart` | 5 MB | Small files + metadata |
| `resumable` | 5 TB | **Everything — required for large files** |

Resumable uploads work by:
1. Sending metadata to reserve an upload session URI.
2. Streaming bytes in chunks to that session URI.
3. Allowing the session to be resumed if the connection drops (up to 7 days).

### Why Busboy Instead of Multer?

Multer defaults to buffering file contents in memory (or disk). Busboy
exposes the raw multipart file part as a `Readable` stream, giving us full
control to pipe it without ever materialising the file in memory.

### Graceful Shutdown

The server listens for `SIGTERM` / `SIGINT` and waits for all connections to
drain before exiting. This prevents in-flight uploads from being corrupted
when the process is restarted by a container orchestrator (Docker, Kubernetes).

---

## Error Codes

| HTTP Status | Cause |
|-------------|-------|
| 400 | Missing file or wrong Content-Type |
| 401 | Invalid or expired Service Account credentials |
| 403 | Service Account lacks permission to the file/folder |
| 404 | File ID not found in Drive |
| 429 | Drive API quota exceeded |
| 504 | Connection to Drive timed out |
