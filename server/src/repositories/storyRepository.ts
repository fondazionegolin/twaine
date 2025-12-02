import { getPool } from '../config/database.js';

export interface StoryNode {
    id: string;
    title: string;
    content: string;
    mediaUri?: string;
    mediaType: 'image' | 'video';
    position: { x: number; y: number };
    connections: Array<{
        id: string;
        targetNodeId: string;
        label: string;
    }>;
    interactionCode?: string;
}

export interface WorldSettings {
    useInventory: boolean;
    useEconomy: boolean;
    useCombat: boolean;
}

export interface StoryStyle {
    background?: string;
    textColor?: string;
    accentColor?: string;
    fontFamily?: string;
    titleFontFamily?: string;
    fontCategory?: string;
    animationClass?: string;
    layoutMode?: string;
    textureType?: string;
    textureColor?: string;
    textureOpacity?: number;
    pageColor?: string;
    pageEdgeColor?: string;
    pageShadow?: boolean;
    ornamentStyle?: string;
    titleFontSize?: string;
    textFontSize?: string;
    customCss?: string;
}

export interface StoryVersion {
    id: string;
    timestamp: Date;
    nodes: StoryNode[];
    description?: string;
}

export interface CharacterReference {
    id: string;
    name: string;
    description: string;
    referenceImage: string;
    model: string;
    strength?: number;
}

export interface Story {
    id: string;
    userId: string;
    name: string;
    prompt: string;
    nodes: StoryNode[];
    worldSettings: WorldSettings;
    style?: StoryStyle;
    versions: StoryVersion[];
    characters: CharacterReference[];
    createdAt: Date;
    updatedAt: Date;
}

export interface StoryListItem {
    id: string;
    name: string;
    prompt: string;
    nodeCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface StoryCreateData {
    userId: string;
    name: string;
    prompt?: string;
    nodes?: StoryNode[];
    worldSettings?: WorldSettings;
    style?: StoryStyle;
    characters?: CharacterReference[];
}

/**
 * Create a new story
 */
export const createStory = async (data: StoryCreateData): Promise<Story> => {
    const pool = getPool();

    const result = await pool.query(
        `INSERT INTO stories (user_id, name, prompt, nodes, world_settings, style, versions, characters)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
        [
            data.userId,
            data.name,
            data.prompt || '',
            JSON.stringify(data.nodes || []),
            JSON.stringify(data.worldSettings || { useInventory: false, useEconomy: false, useCombat: false }),
            JSON.stringify(data.style || {}),
            JSON.stringify([]),
            JSON.stringify(data.characters || []),
        ]
    );

    return mapStoryFromDb(result.rows[0]);
};

/**
 * Find all stories for a user
 */
export const findStoriesByUserId = async (userId: string): Promise<StoryListItem[]> => {
    const pool = getPool();

    const result = await pool.query(
        `SELECT id, name, prompt, 
            jsonb_array_length(nodes) as node_count,
            created_at, updated_at
     FROM stories
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
        [userId]
    );

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        prompt: row.prompt,
        nodeCount: row.node_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
};

/**
 * Find story by ID
 */
export const findStoryById = async (storyId: string): Promise<Story | null> => {
    const pool = getPool();

    const result = await pool.query(
        `SELECT * FROM stories WHERE id = $1`,
        [storyId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return mapStoryFromDb(result.rows[0]);
};

/**
 * Update story
 */
export const updateStory = async (
    storyId: string,
    updates: Partial<{
        name: string;
        prompt: string;
        nodes: StoryNode[];
        worldSettings: WorldSettings;
        style: StoryStyle;
        versions: StoryVersion[];
        characters: CharacterReference[];
    }>
): Promise<Story> => {
    const pool = getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }

    if (updates.prompt !== undefined) {
        fields.push(`prompt = $${paramIndex++}`);
        values.push(updates.prompt);
    }

    if (updates.nodes !== undefined) {
        fields.push(`nodes = $${paramIndex++}`);
        values.push(JSON.stringify(updates.nodes));
    }

    if (updates.worldSettings !== undefined) {
        fields.push(`world_settings = $${paramIndex++}`);
        values.push(JSON.stringify(updates.worldSettings));
    }

    if (updates.style !== undefined) {
        fields.push(`style = $${paramIndex++}`);
        values.push(JSON.stringify(updates.style));
    }

    if (updates.versions !== undefined) {
        fields.push(`versions = $${paramIndex++}`);
        values.push(JSON.stringify(updates.versions));
    }

    if (updates.characters !== undefined) {
        fields.push(`characters = $${paramIndex++}`);
        values.push(JSON.stringify(updates.characters));
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(storyId);

    const result = await pool.query(
        `UPDATE stories
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
        values
    );

    return mapStoryFromDb(result.rows[0]);
};

/**
 * Delete story
 */
export const deleteStory = async (storyId: string): Promise<void> => {
    const pool = getPool();

    await pool.query(
        `DELETE FROM stories WHERE id = $1`,
        [storyId]
    );
};

/**
 * Check if user owns story
 */
export const checkStoryOwnership = async (storyId: string, userId: string): Promise<boolean> => {
    const pool = getPool();

    const result = await pool.query(
        `SELECT user_id FROM stories WHERE id = $1`,
        [storyId]
    );

    if (result.rows.length === 0) {
        return false;
    }

    return result.rows[0].user_id === userId;
};

/**
 * Helper to map database row to Story object
 */
function mapStoryFromDb(row: any): Story {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        prompt: row.prompt,
        nodes: row.nodes || [],
        worldSettings: row.world_settings || { useInventory: false, useEconomy: false, useCombat: false },
        style: row.style || {},
        versions: row.versions || [],
        characters: row.characters || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
