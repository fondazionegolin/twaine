import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  updatePassword,
  comparePassword,
} from '../repositories/userRepository.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('displayName').optional().trim().isLength({ max: 50 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, displayName } = req.body;

      // Check if user exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      // Create user
      const user = await createUser({
        email,
        password,
        displayName,
      });

      // Create session
      req.session.userId = user.id;

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find user with password
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check password
      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Update last login
      await updateLastLogin(user.id);

      // Create session
      req.session.userId = user.id;

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (req: AuthRequest, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await findUserById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/auth/password - Change password
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await findUserByEmail(req.user!.email);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isMatch = await comparePassword(currentPassword, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      await updatePassword(req.userId, newPassword);

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

export default router;
