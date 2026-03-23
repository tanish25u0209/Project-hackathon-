'use strict';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { query } from '../db/pool.js';
import config from '../config/index.js';
import { validateRequest } from '../middleware/validate.js';
import { AppError, AuthenticationError, ValidationError } from '../utils/errors.js';

const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('username must be 3-50 characters'),
    body('password')
        .isLength({ min: 6, max: 100 })
        .withMessage('password must be 6-100 characters'),
    validateRequest,
];

const validateLogin = [
    body('username')
        .trim()
        .isLength({ min: 1 })
        .withMessage('username or email is required'),
    body('password')
        .isLength({ min: 1 })
        .withMessage('password is required'),
    validateRequest,
];

function signToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

async function register(req, res, next) {
    try {
        const username = req.body.username.trim();
        const { password } = req.body;

        const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rowCount > 0) {
            throw new ValidationError('username already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const email = `${username.toLowerCase()}@local.invalid`;
        const { rows } = await query(
            `INSERT INTO users (username, email, display_name, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, created_at`,
            [username, email, username, passwordHash]
        );

        const user = rows[0];
        const token = signToken(user);

        res.status(201).json({
            success: true,
            data: { token, user },
        });
    } catch (err) {
        if (err?.code === '23505') {
            return next(new AppError('username already exists', 409, 'CONFLICT'));
        }
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const identifier = req.body.username.trim();
        const { password } = req.body;

        const { rows } = await query(
            'SELECT id, username, password_hash, created_at FROM users WHERE username = $1 OR email = $1',
            [identifier]
        );

        if (rows.length === 0) {
            throw new AuthenticationError('Invalid username or password');
        }

        const user = rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);

        if (!ok) {
            throw new AuthenticationError('Invalid username or password');
        }

        const token = signToken(user);

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at,
                },
            },
        });
    } catch (err) {
        next(err);
    }
}

export {
    validateRegister,
    validateLogin,
    register,
    login,
};
