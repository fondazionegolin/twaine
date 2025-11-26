/**
 * Flux API Types
 */

export type FluxModelId = 'flux-schnell' | 'flux-dev-gguf' | 'sdxl';

export interface FluxGenerateRequest {
  prompt: string;
  model_id?: FluxModelId;
  steps?: number;
  width?: number;
  height?: number;
}

export interface FluxGenerateResponse {
  image_base64: string;
  message: string;
}

export interface FluxApiError {
  error: string;
  details?: string;
}
