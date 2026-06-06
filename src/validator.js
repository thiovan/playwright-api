/**
 * Payload Validator
 * Validates incoming JSON payloads for the workflow engine.
 */

// All supported actions and their required fields
const ACTION_SCHEMA = {
  'goto':       { required: ['value'] },
  'close':      { required: [] },
  'click':      { required: ['selector'] },
  'dblclick':   { required: ['selector'] },
  'type':       { required: ['selector', 'value'] },
  'select':     { required: ['selector', 'value'] },
  'check':      { required: ['selector'] },
  'uncheck':    { required: ['selector'] },
  'hover':      { required: ['selector'] },
  'drag':       { required: ['selector', 'value'] },
  'upload':     { required: ['selector', 'value'] },
  'screenshot': { required: [] },               // selector is optional
  'eval':       { required: ['value'] },         // selector is optional
  'press':      { required: ['value'] },
  'keydown':    { required: ['value'] },
  'keyup':      { required: ['value'] },
  'mousewheel': { required: ['dx', 'dy'] },
  'cookie-set': { required: ['name', 'value'] },
  'cookie-get': { required: ['name'] },
  'wait':       { required: ['value'] },
  'wait-for':   { required: ['selector'] },
};

const VALID_ACTIONS = Object.keys(ACTION_SCHEMA);

/**
 * Validate the full payload.
 * @param {object} payload - The JSON body
 * @param {object} options - { requireWebhook: boolean }
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePayload(payload, options = {}) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be a JSON object.'] };
  }

  // Validate webhook_url for async mode
  if (options.requireWebhook) {
    if (!payload.webhook_url || typeof payload.webhook_url !== 'string') {
      errors.push('Field "webhook_url" is required for async execution and must be a valid URL string.');
    } else {
      try {
        new URL(payload.webhook_url);
      } catch {
        errors.push(`Invalid "webhook_url": "${payload.webhook_url}" is not a valid URL.`);
      }
    }
  }

  // Validate workflow
  if (!Array.isArray(payload.workflow) || payload.workflow.length === 0) {
    errors.push('Field "workflow" is required and must be a non-empty array.');
    return { valid: false, errors };
  }

  // Validate each action in the workflow
  for (let i = 0; i < payload.workflow.length; i++) {
    const step = payload.workflow[i];
    const prefix = `workflow[${i}]`;

    if (!step || typeof step !== 'object') {
      errors.push(`${prefix}: Each workflow step must be an object.`);
      continue;
    }

    if (!step.action || typeof step.action !== 'string') {
      errors.push(`${prefix}: Missing or invalid "action" field.`);
      continue;
    }

    if (!VALID_ACTIONS.includes(step.action)) {
      errors.push(`${prefix}: Unknown action "${step.action}". Valid actions: ${VALID_ACTIONS.join(', ')}`);
      continue;
    }

    const schema = ACTION_SCHEMA[step.action];
    for (const field of schema.required) {
      if (step[field] === undefined || step[field] === null) {
        errors.push(`${prefix}: Action "${step.action}" requires field "${field}".`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePayload, VALID_ACTIONS };
