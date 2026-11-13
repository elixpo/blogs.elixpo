
#!/usr/bin/env node

/**
 * openai-normalize.js
 *
 * CCR transformer for normalizing conversation messages
 * sent to non-Anthropic OpenAI-compatible providers.
 *
 * Features:
 * - Converts structured text blocks into plain strings.
 * - Removes unsupported cache_control metadata.
 * - Converts Anthropic tool_use/tool_result exchanges
 *   into readable conversation history.
 * - Converts OpenAI tool-call history into user narratives.
 * - Removes unsupported tool_calls and tool_call_id fields.
 * - Merges consecutive user messages.
 * - Preserves native Anthropic formats for Claude models.
 *
 * Supported provider examples:
 * Gemini, Kimi, Qwen, GLM, Perplexity and other
 * OpenAI-compatible providers.
 *
 * CCR registration:
 *
 * {
 *   "transformers": [
 *     { "path": "/abs/path/openai-normalize.js" }
 *   ],
 *   "Providers": [{
 *     "transformer": {
 *       "use": ["openai-normalize", "openai"]
 *     }
 *   }]
 * }
 */

'use strict';

// Only bypass normalization for Claude models.
const ANTHROPIC_NATIVE_RE = /^claude(?:-|$)/i;

/**
 * Safely convert values to strings.
 */
function asString(value) {
    if (value == null) return '';

    if (typeof value === 'string') {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * Extract readable text from structured content.
 */
function extractText(content) {
    if (content == null) return '';

    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return asString(content);
    }

    return content
        .map(block => {
            if (!block || typeof block !== 'object') {
                return asString(block);
            }

            if (block.type === 'text') {
                return typeof block.text === 'string'
                    ? block.text
                    : '';
            }

            return '';
        })
        .filter(Boolean)
        .join('\n');
}

/**
 * Build an index of tool calls from assistant messages.
 */
function buildToolUseIndex(messages) {
    const index = new Map();

    for (const message of messages) {
        if (!message || message.role !== 'assistant') {
            continue;
        }

        // Anthropic-style tool calls.
        if (Array.isArray(message.content)) {
            for (const block of message.content) {
                if (block?.type === 'tool_use' && block.id) {
                    index.set(block.id, {
                        name: block.name || 'unknown',
                        input: asString(block.input ?? {})
                    });
                }
            }
        }

        // OpenAI-style tool calls.
        if (Array.isArray(message.tool_calls)) {
            for (const toolCall of message.tool_calls) {
                if (!toolCall?.id) continue;

                const fn = toolCall.function || {};

                index.set(toolCall.id, {
                    name: fn.name || 'unknown',
                    input: asString(fn.arguments ?? '{}')
                });
            }
        }
    }

    return index;
}

/**
 * Convert tool results into readable conversation notes.
 */
function toolResultNarrative(index, toolId, resultContent) {
    const tool = index.get(toolId);
    const result = extractText(resultContent) ||
        asString(resultContent);

    if (tool) {
        return `Earlier I ran ${tool.name} with ${tool.input}. It returned: ${result}`;
    }

    return `Earlier tool output: ${result}`;
}

/**
 * Check whether the model supports native Anthropic content.
 */
function isAnthropicModel(model) {
    return typeof model === 'string' &&
        ANTHROPIC_NATIVE_RE.test(model);
}

/**
 * Normalize an individual message.
 */
function normalizeMessage(message, toolIndex) {
    if (!message || typeof message !== 'object') {
        return null;
    }

    const role = message.role;

    // System, developer and user messages.
    if (
        role === 'system' ||
        role === 'developer' ||
        role === 'user'
    ) {
        if (Array.isArray(message.content)) {
            const parts = [];

            for (const block of message.content) {
                if (!block || typeof block !== 'object') {
                    continue;
                }

                if (
                    block.type === 'text' &&
                    typeof block.text === 'string'
                ) {
                    parts.push(block.text);
                }

                // Convert Anthropic tool results.
                else if (block.type === 'tool_result') {
                    parts.push(
                        toolResultNarrative(
                            toolIndex,
                            block.tool_use_id,
                            block.content
                        )
                    );
                }
            }

            const content = parts.filter(Boolean).join('\n');

            if (!content) return null;

            return {
                ...message,
                content
            };
        }

        const content = extractText(message.content);

        if (!content) return null;

        return {
            ...message,
            content
        };
    }

    // Assistant messages.
    if (role === 'assistant') {
        let content = '';

        if (Array.isArray(message.content)) {
            content = extractText(message.content);
        } else {
            content = extractText(message.content);
        }

        // Remove tool-only assistant messages.
        if (!content.trim()) {
            return null;
        }

        const normalized = {
            ...message,
            content
        };

        delete normalized.tool_calls;
        delete normalized.tool_call_id;

        return normalized;
    }

    // OpenAI-style tool result messages.
    if (role === 'tool') {
        return {
            role: 'user',
            content: toolResultNarrative(
                toolIndex,
                message.tool_call_id,
                message.content
            )
        };
    }

    // Handle other message roles without changing their structure.
    return {
        ...message
    };
}

/**
 * Merge consecutive user messages.
 */
function mergeConsecutiveUserMessages(messages) {
    const merged = [];

    for (const message of messages) {
        if (!message) continue;

        const previous = merged[merged.length - 1];

        if (
            previous &&
            previous.role === 'user' &&
            message.role === 'user'
        ) {
            previous.content = [
                previous.content,
                message.content
            ].filter(Boolean).join('\n');

        } else {
            merged.push({ ...message });
        }
    }

    return merged;
}

/**
 * Normalize the complete message history.
 */
function flattenMessages(messages) {
    const toolIndex = buildToolUseIndex(messages);

    const normalized = messages
        .map(message => normalizeMessage(message, toolIndex))
        .filter(Boolean);

    const merged = mergeConsecutiveUserMessages(normalized);

    return merged.map(message => {
        const result = { ...message };

        delete result.tool_calls;
        delete result.tool_call_id;

        return result;
    });
}

/**
 * CCR Transformer.
 */
class OpenAINormalizeAdapter {
    constructor(options = {}) {
        this.name = 'openai-normalize';
        this.options = options;
    }

    async transformRequestIn(request) {
        return this._flatten(request);
    }

    async transformRequestOut(request) {
        return this._flatten(request);
    }

    /**
     * Normalize request messages without mutating
     * the original request object.
     */
    _flatten(request) {
        if (!request || typeof request !== 'object') {
            return request;
        }

        const hasBody =
            request.body &&
            typeof request.body === 'object' &&
            !Array.isArray(request.body);

        const body = hasBody ? request.body : request;

        if (!Array.isArray(body.messages)) {
            return request;
        }

        // Preserve native Anthropic content for Claude.
        if (isAnthropicModel(body.model)) {
            return request;
        }

        const normalizedBody = {
            ...body,
            messages: flattenMessages(body.messages)
        };

        // Preserve the original request wrapper.
        if (hasBody) {
            return {
                ...request,
                body: normalizedBody
            };
        }

        return normalizedBody;
    }
}

module.exports = OpenAINormalizeAdapter;
