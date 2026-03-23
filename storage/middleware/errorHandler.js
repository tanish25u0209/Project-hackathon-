'use strict';

function globalErrorHandler(err, _req, res, _next) {
  const statusCode = Number(err?.code);

  if (statusCode === 401) {
    return res.status(401).json({ error: 'Authentication with Google Drive failed.' });
  }

  if (statusCode === 403) {
    return res.status(403).json({ error: 'Permission denied. Check folder/file sharing with Service Account.' });
  }

  if (statusCode === 404) {
    return res.status(404).json({ error: 'File not found. Verify the fileId is correct and accessible by the Service Account.' });
  }

  if (statusCode === 429) {
    return res.status(429).json({ error: 'Google Drive API quota exceeded. Please retry later.' });
  }

  if (statusCode === 504) {
    return res.status(504).json({ error: 'Upstream timeout while communicating with Google Drive.' });
  }

  if (err?.message?.includes('Unexpected end of form')) {
    return res.status(400).json({ error: 'Invalid multipart/form-data payload.' });
  }

  console.error('[ERROR]', err);
  return res.status(500).json({ error: 'Internal server error.' });
}

module.exports = { globalErrorHandler };
