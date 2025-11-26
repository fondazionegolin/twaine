import { FluxGenerateRequest, FluxGenerateResponse } from '../types/imageTypes.js';

const FLUX_API_URL = process.env.FLUX_API_URL || 'https://image.golinelli.ai';
const FLUX_API_KEY = process.env.FLUX_API_KEY;

/**
 * Generate an image using the Flux API
 */
export const generateImage = async (
    request: FluxGenerateRequest
): Promise<FluxGenerateResponse> => {
    if (!FLUX_API_KEY) {
        throw new Error('FLUX_API_KEY is not configured in environment variables');
    }

    // Set defaults
    const payload = {
        prompt: request.prompt,
        model_id: request.model_id || 'flux-schnell',
        steps: request.steps || 4,
        width: request.width || 1024,
        height: request.height || 1024,
    };

    try {
        const response = await fetch(`${FLUX_API_URL}/generate`, {
            method: 'POST',
            headers: {
                'X-API-Key': FLUX_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Flux API error (${response.status}): ${errorText}`);
        }

        const result = await response.json() as FluxGenerateResponse;

        if (!result.image_base64) {
            throw new Error('Invalid response from Flux API: missing image_base64');
        }

        return result;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to generate image: ${error.message}`);
        }
        throw new Error('Failed to generate image: Unknown error');
    }
};

/**
 * Health check for Flux API
 */
export const checkFluxHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${FLUX_API_URL}/health`);
        const data = await response.json() as { status: string };
        return data.status === 'ok';
    } catch (error) {
        console.error('Flux API health check failed:', error);
        return false;
    }
};
