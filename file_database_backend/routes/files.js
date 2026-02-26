'use strict';

const express = require('express');
const Busboy = require('busboy');
const {
  uploadFileToDrive,
  downloadFileFromDrive,
  getFileMetadata,
} = require('../driveService');

const router = express.Router();

router.post('/upload', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Content-Type must be multipart/form-data.' });
  }

  const busboy = Busboy({ headers: req.headers, limits: { files: 1 } });

  let foundFile = false;
  let uploadPromise;

  busboy.on('file', (fieldname, file, info) => {
    if (fieldname !== 'file') {
      file.resume();
      return;
    }

    foundFile = true;
    const filename = info?.filename || 'upload.bin';
    const mimeType = info?.mimeType || 'application/octet-stream';

    uploadPromise = uploadFileToDrive({
      filename,
      mimeType,
      fileStream: file,
      fileSize: Number(req.headers['content-length']) || undefined,
    });
  });

  busboy.on('error', next);

  busboy.on('finish', async () => {
    if (!foundFile || !uploadPromise) {
      return res.status(400).json({ error: 'Missing file field. Use multipart field name "file".' });
    }

    try {
      const file = await uploadPromise;
      return res.status(201).json({
        message: 'File uploaded successfully.',
        file,
      });
    } catch (err) {
      return next(err);
    }
  });

  req.pipe(busboy);
});

router.get('/file/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { fileStream, metadata } = await downloadFileFromDrive(fileId);

    res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.name || 'download'}"`);
    if (metadata.size) {
      res.setHeader('Content-Length', metadata.size);
    }

    fileStream.on('error', next);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get('/file/:fileId/meta', async (req, res, next) => {
  try {
    const file = await getFileMetadata(req.params.fileId);
    res.status(200).json(file);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
