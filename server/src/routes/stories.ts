import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Story } from '../models/Story.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/stories - Get all stories for current user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stories = await Story.find({ userId: req.userId })
      .select('name prompt createdAt updatedAt nodes')
      .sort({ updatedAt: -1 });

    // Transform to include node count
    const storiesWithCount = stories.map(story => ({
      id: story._id,
      name: story.name,
      prompt: story.prompt,
      nodeCount: story.nodes?.length || 0,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    }));

    res.json({ stories: storiesWithCount });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Failed to get stories' });
  }
});

// GET /api/stories/:id - Get a single story
router.get(
  '/:id',
  param('id').isMongoId().withMessage('Invalid story ID'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const story = await Story.findOne({
        _id: req.params.id,
        userId: req.userId,
      });

      if (!story) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }

      res.json({
        story: {
          id: story._id,
          name: story.name,
          prompt: story.prompt,
          nodes: story.nodes,
          worldSettings: story.worldSettings,
          style: story.style,
          versions: story.versions,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
        },
      });
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
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, prompt, nodes, worldSettings, style } = req.body;

      const story = new Story({
        userId: req.userId,
        name,
        prompt: prompt || '',
        nodes: nodes || [],
        worldSettings: worldSettings || {
          useInventory: false,
          useEconomy: false,
          useCombat: false,
        },
        style,
      });

      await story.save();

      res.status(201).json({
        message: 'Story created',
        story: {
          id: story._id,
          name: story.name,
          prompt: story.prompt,
          nodes: story.nodes,
          worldSettings: story.worldSettings,
          style: story.style,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
        },
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
    param('id').isMongoId().withMessage('Invalid story ID'),
    body('name').optional().trim().notEmpty(),
    body('prompt').optional().trim(),
    body('nodes').optional().isArray(),
    body('worldSettings').optional().isObject(),
    body('style').optional().isObject(),
    body('versions').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const story = await Story.findOne({
        _id: req.params.id,
        userId: req.userId,
      });

      if (!story) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }

      // Update fields
      const { name, prompt, nodes, worldSettings, style, versions } = req.body;
      
      if (name !== undefined) story.name = name;
      if (prompt !== undefined) story.prompt = prompt;
      if (nodes !== undefined) story.nodes = nodes;
      if (worldSettings !== undefined) story.worldSettings = worldSettings;
      if (style !== undefined) story.style = style;
      if (versions !== undefined) story.versions = versions;

      await story.save();

      res.json({
        message: 'Story updated',
        story: {
          id: story._id,
          name: story.name,
          prompt: story.prompt,
          nodes: story.nodes,
          worldSettings: story.worldSettings,
          style: story.style,
          versions: story.versions,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
        },
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
  param('id').isMongoId().withMessage('Invalid story ID'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const result = await Story.deleteOne({
        _id: req.params.id,
        userId: req.userId,
      });

      if (result.deletedCount === 0) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }

      res.json({ message: 'Story deleted' });
    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({ error: 'Failed to delete story' });
    }
  }
);

export default router;
