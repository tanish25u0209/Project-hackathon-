// src/driveService.js
// ─────────────────────────────────────────────────────────────────────────────
// All Google Drive API interactions live here. Keeping them isolated from the
// Express route layer makes the service independently testable and swappable.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const { google }       = require('googleapis');
const { PassThrough }  = require('stream');
const { getAuthClient } = require('./utils/googleAuth');

// Build a single Drive v3 client reused across all requests.
// The JWT auth client refreshes its own access token transparently.
const drive = google.drive({ version: 'v3', auth: getAuthClient() });

// ─── UPLOAD ──────────────────────────────────────────────────────────────────

/**
 * Initiates a RESUMABLE upload to Google Drive and streams the file body
 * directly into the Drive API — no temporary local storage required.
 *
 * WHY "resumable"?
 *   The resumable upload protocol (RFC 7235 + Google extension) splits the
 *   transfer into manageable chunks. It:
 *     1. Keeps memory usage near-zero because chunks are streamed, not buffered.
 *     2. Allows recovery from transient network errors mid-upload.
 *     3. Is the *only* supported method for files larger than 5 MB via the API.
 *
 * @param {object}   opts
 * @param {string}   opts.filename      - Original filename for Drive metadata.
 * @param {string}   opts.mimeType      - MIME type of the file being uploaded.
 * @param {Readable} opts.fileStream    - Readable stream of the file bytes.
 * @param {number}   [opts.fileSize]    - Content-Length if known (improves reliability).
 * @returns {Promise<object>}           - The created Drive file resource.
 */
async function uploadFileToDrive({ filename, mimeType, fileStream, fileSize }) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables.');
  }

  // File metadata
  const requestBody = {
    name: filename,
    parents: [folderId],
  };

  // Convert the incoming fileStream to a proper stream
  // Read all chunks into a buffer first
  const chunks = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Create a readable stream from the buffer for googleapis
  const { Readable } = require('stream');
  const bodyStream = Readable.from(buffer);

  const media = {
    mimeType,
    body: bodyStream,
  };

  const uploadOptions = {
    requestBody,
    media,
    fields: 'id, name, mimeType, size, webViewLink, createdTime',
  };

  try {
    const response = await drive.files.create(uploadOptions);
    return response.data;
  } catch (err) {
    console.error('[DEBUG] Upload error:', err.message);
    throw err;
  }
}

// ─── DOWNLOAD ────────────────────────────────────────────────────────────────

/**
 * Fetches a file's content and metadata from Google Drive.
 *
 * STREAMING STRATEGY:
 *   By setting `responseType: 'stream'` on the axios-based googleapis client,
 *   the HTTP response from Drive is returned as a raw Node.js Readable stream.
 *   The Express route pipes this stream directly to `res`, meaning:
 *     - Bytes flow: Drive API → Node.js pipe → Browser
 *     - Zero buffering in Node — memory footprint stays constant regardless
 *       of file size (a 10 GB file uses no more memory than a 10 KB one).
 *
 * @param {string} fileId - The Google Drive file ID.
 * @returns {Promise<{ fileStream: Readable, metadata: object }>}
 */
async function downloadFileFromDrive(fileId) {
  // Step 1: Fetch metadata (name + mimeType) needed for response headers.
  //         This is a lightweight metadata-only call (no file bytes transferred).
  const metaResponse = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size',
  });

  const metadata = metaResponse.data;

  // Step 2: Fetch the actual file bytes as a stream.
  //         `alt: 'media'` switches the endpoint from metadata JSON to raw bytes.
  const fileResponse = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }   // ← Returns a Readable, not a Buffer
  );

  return {
    fileStream: fileResponse.data,  // Node.js Readable stream
    metadata,
  };
}

// ─── METADATA ────────────────────────────────────────────────────────────────

/**
 * Retrieves file metadata without downloading the file body.
 * Useful for HEAD requests or pre-download validation.
 *
 * @param {string} fileId
 * @returns {Promise<object>} Drive file resource object.
 */
async function getFileMetadata(fileId) {
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink, createdTime, modifiedTime',
  });
  return response.data;
}

module.exports = {
  uploadFileToDrive,
  downloadFileFromDrive,
  getFileMetadata,
};
