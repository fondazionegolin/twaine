import * as express from 'express';
import { body, validationResult } from 'express-validator';
import { generateImage, checkFluxHealth } from '../services/fluxService.js';
import { FluxGenerateRequest } from '../types/imageTypes.js';

const router = express.Router();

/**
 * POST /api/images/generate
 * Generate an image using Flux API
 */
router.post(
    '/generate',
    [
        body('prompt')
            .isString()
            .trim()
            .notEmpty()
            .withMessage('Prompt is required and must be a non-empty string'),
        body('model_id')
            .optional()
            .isIn(['flux-schnell', 'flux-dev-gguf', 'sdxl'])
            .withMessage('Invalid model_id'),
        body('steps')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Steps must be between 1 and 100'),
        body('width')
            .optional()
            .isInt({ min: 256, max: 2048 })
            .withMessage('Width must be between 256 and 2048'),
        body('height')
            .optional()
            .isInt({ min: 256, max: 2048 })
            .withMessage('Height must be between 256 and 2048'),
    ],
    async (req: express.Request, res: express.Response) => {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const request: FluxGenerateRequest = {
                prompt: req.body.prompt,
                model_id: req.body.model_id,
                steps: req.body.steps,
                width: req.body.width,
                height: req.body.height,
            };

            const result = await generateImage(request);
            res.json(result);
        } catch (error) {
            console.error('Image generation error:', error);
            res.status(500).json({
                error: 'Failed to generate image',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * GET /api/images/health
 * Check Flux API health
 */
router.get('/health', async (req, res) => {
    try {
        const isHealthy = await checkFluxHealth();
        res.json({
            status: isHealthy ? 'ok' : 'error',
            service: 'Flux API',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            service: 'Flux API',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
