'use strict';

import { body, param } from 'express-validator';
import { query, withTransaction } from '../db/pool.js';
import { validateRequest } from '../middleware/validate.js';
import { NotFoundError, ValidationError, AuthenticationError } from '../utils/errors.js';

const validateCreateProject = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('name is required (1-255 chars)'),
    validateRequest,
];

const validateProjectIdParam = [
    param('id').isInt({ min: 1 }).withMessage('project id must be a positive integer'),
    validateRequest,
];

const validateInviteMember = [
    param('id').isInt({ min: 1 }).withMessage('project id must be a positive integer'),
    body('username').trim().isLength({ min: 1 }).withMessage('username is required'),
    validateRequest,
];

const validateAddProjectFile = [
    param('id').isInt({ min: 1 }).withMessage('project id must be a positive integer'),
    body('googleFileId').trim().isLength({ min: 1 }).withMessage('googleFileId is required'),
    body('fileName').trim().isLength({ min: 1, max: 500 }).withMessage('fileName is required'),
    body('size').optional().isInt({ min: 0 }).withMessage('size must be a positive integer'),
    body('mimeType').optional().isLength({ max: 100 }).withMessage('mimeType too long'),
    validateRequest,
];

const validateDeleteProjectFile = [
    param('id').isInt({ min: 1 }).withMessage('project id must be a positive integer'),
    param('fileId').isInt({ min: 1 }).withMessage('file id must be a positive integer'),
    validateRequest,
];

const validateRenameProjectFile = [
    param('id').isInt({ min: 1 }).withMessage('project id must be a positive integer'),
    param('fileId').isInt({ min: 1 }).withMessage('file id must be a positive integer'),
    body('fileName').trim().isLength({ min: 1 }).withMessage('fileName is required'),
    validateRequest,
];

async function ensureProjectMembership(projectId, userId) {
    const membership = await query(
        `SELECT role FROM project_members
         WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId]
    );

    if (membership.rowCount === 0) {
        throw new AuthenticationError('Forbidden');
    }

    return membership.rows[0];
}

async function ensureProjectOwner(projectId, userId) {
    const membership = await ensureProjectMembership(projectId, userId);
    if (membership.role !== 'Admin') {
        throw new AuthenticationError('Forbidden');
    }
}

async function listProjects(req, res, next) {
    try {
        const { rows } = await query(
            `SELECT p.id, p.name, COALESCE(p.created_by, p.owner_id) AS created_by, p.created_at, pm.role
             FROM projects p
             JOIN project_members pm ON pm.project_id = p.id
             WHERE pm.user_id = $1
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        res.status(200).json({
            success: true,
            data: { projects: rows },
        });
    } catch (err) {
        next(err);
    }
}

async function createProject(req, res, next) {
    try {
        const name = req.body.name.trim();
        const createdBy = req.user.id;

        const project = await withTransaction(async (client) => {
            const inserted = await client.query(
                `INSERT INTO projects (name, owner_id, created_by)
                 VALUES ($1, $2, $2)
                 RETURNING id, name, owner_id, created_by, created_at`,
                [name, createdBy]
            );

            const created = inserted.rows[0];

            await client.query(
                `INSERT INTO project_members (project_id, user_id, role)
                 VALUES ($1, $2, 'Admin')`,
                [created.id, createdBy]
            );

            return created;
        });

        res.status(201).json({
            success: true,
            data: { project },
        });
    } catch (err) {
        next(err);
    }
}

async function addProjectMember(req, res, next) {
    try {
        const projectId = req.params.id;
        const username = req.body.username.trim();

        await ensureProjectOwner(projectId, req.user.id);

        const userResult = await query('SELECT id, username FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            throw new NotFoundError('User not found');
        }

        const member = userResult.rows[0];

        await query(
            `INSERT INTO project_members (project_id, user_id, role)
             VALUES ($1, $2, 'Editor')
             ON CONFLICT (project_id, user_id) DO NOTHING`,
            [projectId, member.id]
        );

        res.status(200).json({
            success: true,
            data: { member },
        });
    } catch (err) {
        next(err);
    }
}

async function listProjectMembers(req, res, next) {
    try {
        const projectId = req.params.id;
        await ensureProjectMembership(projectId, req.user.id);

        const { rows } = await query(
            `SELECT u.id, u.username, pm.role, pm.joined_at AS added_at
             FROM project_members pm
             JOIN users u ON u.id = pm.user_id
             WHERE pm.project_id = $1
             ORDER BY CASE WHEN pm.role = 'Admin' THEN 0 ELSE 1 END, u.username`,
            [projectId]
        );

        res.status(200).json({
            success: true,
            data: { members: rows },
        });
    } catch (err) {
        next(err);
    }
}

async function listProjectFiles(req, res, next) {
    try {
        const projectId = req.params.id;
        await ensureProjectMembership(projectId, req.user.id);

        const { rows } = await query(
            `SELECT pf.id, pf.project_id, pf.google_file_id, pf.file_name, pf.size, pf.mime_type,
                    pf.uploaded_by, pf.uploaded_at, u.username AS uploaded_by_username
             FROM project_files pf
             LEFT JOIN users u ON u.id = pf.uploaded_by
             WHERE pf.project_id = $1
             ORDER BY pf.uploaded_at DESC`,
            [projectId]
        );

        res.status(200).json({
            success: true,
            data: { files: rows },
        });
    } catch (err) {
        next(err);
    }
}

async function addProjectFile(req, res, next) {
    try {
        const projectId = req.params.id;
        const { googleFileId, fileName, size, mimeType } = req.body;
        await ensureProjectMembership(projectId, req.user.id);

        const inserted = await query(
            `INSERT INTO project_files (project_id, google_file_id, file_name, size, mime_type, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, project_id, google_file_id, file_name, size, mime_type, uploaded_by, uploaded_at`,
            [projectId, googleFileId, fileName.trim(), size || null, mimeType || null, req.user.id]
        );

        res.status(201).json({
            success: true,
            data: { file: inserted.rows[0] },
        });
    } catch (err) {
        next(err);
    }
}

async function deleteProjectFile(req, res, next) {
    try {
        const projectId = req.params.id;
        const fileId = req.params.fileId;
        const userId = req.user.id;

        const membership = await ensureProjectMembership(projectId, userId);

        let queryStr, params;
        if (membership.role === 'Admin') {
            queryStr = `DELETE FROM project_files WHERE id = $1 AND project_id = $2 RETURNING id, google_file_id`;
            params = [fileId, projectId];
        } else {
            queryStr = `DELETE FROM project_files WHERE id = $1 AND project_id = $2 AND uploaded_by = $3 RETURNING id, google_file_id`;
            params = [fileId, projectId, userId];
        }

        const removed = await query(queryStr, params);

        if (removed.rowCount === 0) {
            throw new NotFoundError('File not found or permission denied');
        }

        const googleFileId = removed.rows[0].google_file_id;
        if (googleFileId) {
            // Delete the actual file from Google Drive via the storage microservice
            fetch(`http://localhost:8000/file/${googleFileId}`, { method: 'DELETE' })
                .catch(err => console.error('Failed to notify storage service of deletion:', err));
        }

        res.status(200).json({
            success: true,
            data: { id: removed.rows[0].id },
        });
    } catch (err) {
        next(err);
    }
}

async function renameProjectFile(req, res, next) {
    try {
        const projectId = req.params.id;
        const fileId = req.params.fileId;
        const userId = req.user.id;
        const { fileName } = req.body;

        const membership = await ensureProjectMembership(projectId, userId);

        let queryStr, params;
        if (membership.role === 'Admin') {
            queryStr = `UPDATE project_files SET file_name = $1 WHERE id = $2 AND project_id = $3 RETURNING id, file_name`;
            params = [fileName, fileId, projectId];
        } else {
            queryStr = `UPDATE project_files SET file_name = $1 WHERE id = $2 AND project_id = $3 AND uploaded_by = $4 RETURNING id, file_name`;
            params = [fileName, fileId, projectId, userId];
        }

        const updated = await query(queryStr, params);

        if (updated.rowCount === 0) {
            throw new NotFoundError('File not found or permission denied');
        }

        res.status(200).json({
            success: true,
            data: updated.rows[0],
        });
    } catch (err) {
        next(err);
    }
}

export {
    validateCreateProject,
    validateProjectIdParam,
    validateInviteMember,
    validateAddProjectFile,
    validateDeleteProjectFile,
    validateRenameProjectFile,
    listProjects,
    createProject,
    addProjectMember,
    listProjectMembers,
    listProjectFiles,
    addProjectFile,
    deleteProjectFile,
    renameProjectFile,
};
