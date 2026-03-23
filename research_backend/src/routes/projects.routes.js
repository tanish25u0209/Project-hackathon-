'use strict';

import { Router } from 'express';
import { requireJwtAuth } from '../middleware/jwtAuth.js';
import {
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
} from '../controllers/projects.controller.js';

const router = Router();

router.use(requireJwtAuth);

router.get('/', listProjects);
router.post('/', validateCreateProject, createProject);
router.get('/:id/members', validateProjectIdParam, listProjectMembers);
router.post('/:id/members', validateInviteMember, addProjectMember);
router.get('/:id/files', validateProjectIdParam, listProjectFiles);
router.post('/:id/files', validateAddProjectFile, addProjectFile);
router.put('/:id/files/:fileId', validateRenameProjectFile, renameProjectFile);
router.delete('/:id/files/:fileId', validateDeleteProjectFile, deleteProjectFile);

export default router;
