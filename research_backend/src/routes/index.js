'use strict';

import { Router } from 'express';
import researchRoutes from './research.routes.js';
import sessionRoutes from './session.routes.js';
import multimodelRoutes from './multimodel.routes.js';
import synthesisRoutes from './synthesis.routes.js';
import ideasRoutes from './ideas.routes.js';
import authRoutes from './auth.routes.js';
import projectsRoutes from './projects.routes.js';

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
router.use('/sessions', synthesisRoutes); // Mount synthesis routes on /sessions/:sessionId/synthesize
router.use('/multimodel', multimodelRoutes);
router.use('/ideas', ideasRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectsRoutes);

export default router;
