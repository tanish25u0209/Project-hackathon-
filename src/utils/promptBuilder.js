'use strict';

/**
 * Builds the structured research prompt sent to every LLM provider.
 * The prompt enforces strict JSON output to ensure consistent parsing.
 */

const SYSTEM_PROMPT = `You are an expert research analyst and creative strategist.
Your task is to generate high-quality, actionable ideas in response to a problem statement.

STRICT RULES:
1. You MUST respond with ONLY valid JSON — no markdown, no explanation, no preamble.
2. Generate exactly 5 distinct, non-overlapping ideas.
3. Every field is required — do not omit any field.
4. confidence_score and novelty_score must be floats between 0.0 and 1.0.
5. category must be one of: technical, business, research, design, policy, other.
6. tags must be an array of 3–6 lowercase keyword strings.
7. Do NOT repeat ideas — each must explore a genuinely different angle.
8. Ideas must be specific, not generic platitudes.`;

const OUTPUT_SCHEMA_DESCRIPTION = `
{
  "ideas": [
    {
      "title": "string (max 120 chars, clear and specific)",
      "description": "string (150–400 words, detailed explanation of the idea)",
      "rationale": "string (50–150 words, why this idea is promising and worth pursuing)",
      "category": "technical | business | research | design | policy | other",
      "confidence_score": 0.0-1.0,
      "novelty_score": 0.0-1.0,
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}`;

/**
 * @param {string} problemStatement - The user's problem statement
 * @returns {{ system: string, user: string }}
 */
function buildResearchPrompt(problemStatement) {
    const user = `PROBLEM STATEMENT:
${problemStatement}

Generate 5 creative, high-quality, and actionable research ideas to address this problem.
Each idea should explore a fundamentally different angle or approach.

Respond ONLY with valid JSON matching this exact structure:
${OUTPUT_SCHEMA_DESCRIPTION}`;

    return { system: SYSTEM_PROMPT, user };
}

/**
 * Builds the idea deepening prompt.
 * @param {Object} idea - The idea object to deepen
 * @param {string} problemStatement - Original problem statement
 * @param {number} depthLevel - 1 (overview), 2 (detailed), 3 (implementation)
 * @returns {{ system: string, user: string }}
 */
function buildDeepeningPrompt(idea, problemStatement, depthLevel = 1) {
    const depthInstructions = {
        1: `Provide a comprehensive strategic overview including: market context, key stakeholders, 
        potential challenges, success metrics, and estimated timeline. 
        Give 3–5 concrete next steps to begin exploring this idea.`,

        2: `Provide a detailed implementation plan including: technical architecture (if applicable), 
        resource requirements, risk analysis with mitigation strategies, competitive landscape, 
        financial considerations, and a phased roadmap with milestones.`,

        3: `Provide a full execution blueprint including: step-by-step implementation guide, 
        specific tools/technologies/vendors to use, team structure, KPIs and measurement framework, 
        detailed cost breakdown, legal/compliance considerations, and how to measure success at 90 days, 
        6 months, and 1 year.`,
    };

    const instruction = depthInstructions[depthLevel] || depthInstructions[1];

    const deepeningSchema = `{
  "deepening": {
    "idea_title": "string",
    "depth_level": ${depthLevel},
    "executive_summary": "string (2–3 sentences)",
    "key_insights": ["insight1", "insight2", "insight3"],
    "detailed_analysis": "string (500–1000 words)",
    "action_items": [
      {
        "step": "string",
        "description": "string",
        "priority": "high | medium | low",
        "estimated_effort": "string"
      }
    ],
    "risks": [
      { "risk": "string", "severity": "high | medium | low", "mitigation": "string" }
    ],
    "success_metrics": ["metric1", "metric2"],
    "resources_needed": ["resource1", "resource2"],
    "estimated_timeline": "string",
    "confidence_score": 0.0-1.0
  }
}`;

    const system = `You are an expert strategist and implementation specialist.
Respond ONLY with valid JSON. No markdown, no explanation outside the JSON structure.`;

    const user = `ORIGINAL PROBLEM: ${problemStatement}

IDEA TO DEEPEN:
Title: ${idea.title}
Description: ${idea.description}
Rationale: ${idea.rationale}
Category: ${idea.category}

TASK: ${instruction}

Respond ONLY with valid JSON matching this exact structure:
${deepeningSchema}`;

    return { system, user };
}

module.exports = { buildResearchPrompt, buildDeepeningPrompt };
