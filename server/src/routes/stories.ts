import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  createStory,
  findStoriesByUserId,
  findStoryById,
  updateStory,
  deleteStory,
  checkStoryOwnership,
} from '../repositories/storyRepository.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/stories - Get all stories for current user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const stories = await findStoriesByUserId(req.userId);
    res.json({ stories });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Failed to get stories' });
  }
});

// GET /api/stories/:id - Get a single story
router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid story ID'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const story = await findStoryById(req.params.id);

      if (!story) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }

      // Check ownership
      if (story.userId !== req.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({ story });
    } catch (error) {
      console.error('Get story error:', error);
      res.status(500).json({ error: 'Failed to get story' });
    }
  }
);

// POST /api/stories - Create a new story
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Story name required'),
    body('prompt').optional().trim(),
    body('nodes').optional().isArray(),
    body('worldSettings').optional().isObject(),
    body('style').optional().isObject(),
    body('characters').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { name, prompt, nodes, worldSettings, style, characters } = req.body;

      const story = await createStory({
        userId: req.userId,
        name,
        prompt,
        nodes,
        worldSettings,
        style,
        characters,
      });

      res.status(201).json({
        message: 'Story created',
        story,
      });
    } catch (error) {
      console.error('Create story error:', error);
      res.status(500).json({ error: 'Failed to create story' });
    }
  }
);

// PUT /api/stories/:id - Update a story
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid story ID'),
    body('name').optional().trim().notEmpty(),
    body('prompt').optional().trim(),
    body('nodes').optional().isArray(),
    body('worldSettings').optional().isObject(),
    body('style').optional().isObject(),
    body('versions').optional().isArray(),
    body('characters').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Check ownership
      const isOwner = await checkStoryOwnership(req.params.id, req.userId);
      if (!isOwner) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }

      // Update fields
      const { name, prompt, nodes, worldSettings, style, versions, characters } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (prompt !== undefined) updates.prompt = prompt;
      if (nodes !== undefined) updates.nodes = nodes;
      if (worldSettings !== undefined) updates.worldSettings = worldSettings;
      if (style !== undefined) updates.style = style;
      if (versions !== undefined) updates.versions = versions;
      if (characters !== undefined) updates.characters = characters;

      const story = await updateStory(req.params.id, updates);

      res.json({
        message: 'Story updated',
        story,
      });
    } catch (error) {
      console.error('Update story error:', error);
      res.status(500).json({ error: 'Failed to update story' });
    }
  }
);

// DELETE /api/stories/:id - Delete a story
router.delete(
  '/:id',
  param('id').isUUID().withMessage('Invalid story ID'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Check ownership
      const isOwner = await checkStoryOwnership(req.params.id, req.userId);
      if (!isOwner) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }

      await deleteStory(req.params.id);

      res.json({ message: 'Story deleted' });
    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({ error: 'Failed to delete story' });
    }
  }
);

export default router;
