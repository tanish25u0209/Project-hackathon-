'use strict';

const { Router } = require('express');
const researchRoutes = require('./research.routes');
const sessionRoutes = require('./session.routes');

const router = Router();

// ─────────────────────────────────────────────
// Health check (no auth required)
// ─────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime: Math.floor(process.uptime()),
        },
    });
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
router.use('/research', researchRoutes);
router.use('/sessions', sessionRoutes);

module.exports = router;
