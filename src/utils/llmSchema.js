'use strict';

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, coerceTypes: false });
addFormats(ajv);

// ─────────────────────────────────────────────
// Schema: Individual Idea
// ─────────────────────────────────────────────
const ideaSchema = {
    type: 'object',
    required: ['title', 'description', 'rationale', 'category', 'confidence_score', 'novelty_score', 'tags'],
    additionalProperties: true,
    properties: {
        title: {
            type: 'string',
            minLength: 5,
            maxLength: 500,
        },
        description: {
            type: 'string',
            minLength: 50,
        },
        rationale: {
            type: 'string',
            minLength: 20,
        },
        category: {
            type: 'string',
            enum: ['technical', 'business', 'research', 'design', 'policy', 'other'],
        },
        confidence_score: {
            type: 'number',
            minimum: 0.0,
            maximum: 1.0,
        },
        novelty_score: {
            type: 'number',
            minimum: 0.0,
            maximum: 1.0,
        },
        tags: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: { type: 'string', minLength: 1 },
        },
    },
};

// ─────────────────────────────────────────────
// Schema: LLM Response Root
// ─────────────────────────────────────────────
const llmResponseSchema = {
    type: 'object',
    required: ['ideas'],
    additionalProperties: true,
    properties: {
        ideas: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: ideaSchema,
        },
    },
};

// ─────────────────────────────────────────────
// Schema: Deepening Response
// ─────────────────────────────────────────────
const actionItemSchema = {
    type: 'object',
    required: ['step', 'description', 'priority'],
    properties: {
        step: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        estimated_effort: { type: 'string' },
    },
};

const riskSchema = {
    type: 'object',
    required: ['risk', 'severity'],
    properties: {
        risk: { type: 'string' },
        severity: { type: 'string', enum: ['high', 'medium', 'low'] },
        mitigation: { type: 'string' },
    },
};

const deepeningResponseSchema = {
    type: 'object',
    required: ['deepening'],
    properties: {
        deepening: {
            type: 'object',
            required: ['idea_title', 'depth_level', 'executive_summary', 'detailed_analysis', 'action_items'],
            properties: {
                idea_title: { type: 'string' },
                depth_level: { type: 'integer', minimum: 1, maximum: 3 },
                executive_summary: { type: 'string' },
                key_insights: { type: 'array', items: { type: 'string' } },
                detailed_analysis: { type: 'string', minLength: 100 },
                action_items: { type: 'array', items: actionItemSchema },
                risks: { type: 'array', items: riskSchema },
                success_metrics: { type: 'array', items: { type: 'string' } },
                resources_needed: { type: 'array', items: { type: 'string' } },
                estimated_timeline: { type: 'string' },
                confidence_score: { type: 'number', minimum: 0, maximum: 1 },
            },
        },
    },
};

// Compile validators
const validateLlmResponse = ajv.compile(llmResponseSchema);
const validateDeepeningResponse = ajv.compile(deepeningResponseSchema);

/**
 * Parses raw LLM text output and validates against schema.
 * Strips markdown code fences if present (models sometimes wrap JSON in ```json).
 *
 * @param {string} rawText - Raw text from LLM
 * @param {'research' | 'deepening'} type - Which schema to validate against
 * @returns {{ valid: boolean, data: Object|null, errors: Array|null }}
 */
function parseAndValidateLlmOutput(rawText, type = 'research') {
    // Strip markdown code fences
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Some models wrap in a top-level object key — try to extract just the JSON object
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        return {
            valid: false,
            data: null,
            errors: [{ message: `JSON.parse failed: ${e.message}`, rawOutput: rawText.slice(0, 500) }],
        };
    }

    const validator = type === 'deepening' ? validateDeepeningResponse : validateLlmResponse;
    const valid = validator(parsed);

    if (!valid) {
        return {
            valid: false,
            data: null,
            errors: validator.errors,
        };
    }

    return { valid: true, data: parsed, errors: null };
}

module.exports = {
    parseAndValidateLlmOutput,
    llmResponseSchema,
    deepeningResponseSchema,
    ideaSchema,
};
