import { getPool } from '../config/database.js';
import bcrypt from 'bcryptjs';

export interface User {
    id: string;
    email: string;
    password_hash: string;
    display_name: string | null;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
}

export interface UserCreateData {
    email: string;
    password: string;
    displayName?: string;
}

export interface UserPublic {
    id: string;
    email: string;
    displayName: string | null;
    createdAt: Date;
}

/**
 * Create a new user
 */
export const createUser = async (data: UserCreateData): Promise<UserPublic> => {
    const pool = getPool();

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const result = await pool.query(
        `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name, created_at`,
        [data.email, passwordHash, data.displayName || data.email.split('@')[0]]
    );

    const user = result.rows[0];
    return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
    };
};

/**
 * Find user by email (with password for authentication)
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
    const pool = getPool();

    const result = await pool.query(
        `SELECT id, email, password_hash, display_name, created_at, updated_at, last_login_at
     FROM users
     WHERE email = $1`,
        [email]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
};

/**
 * Find user by ID
 */
export const findUserById = async (id: string): Promise<UserPublic | null> => {
    const pool = getPool();

    const result = await pool.query(
        `SELECT id, email, display_name, created_at
     FROM users
     WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const user = result.rows[0];
    return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
    };
};

/**
 * Update last login timestamp
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
    const pool = getPool();

    await pool.query(
        `UPDATE users
     SET last_login_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
        [userId]
    );
};

/**
 * Update user password
 */
export const updatePassword = async (userId: string, newPassword: string): Promise<void> => {
    const pool = getPool();

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
        `UPDATE users
     SET password_hash = $1
     WHERE id = $2`,
        [passwordHash, userId]
    );
};

/**
 * Compare password with hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};
