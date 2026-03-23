'use strict';

import { Router } from 'express';
import {
    validateRegister,
    validateLogin,
    register,
    login,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

export default router;
