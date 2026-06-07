/**
 * Payload Validator
 * Validates incoming JSON payloads for the workflow engine.
 */

// All supported actions and their required fields
const ACTION_SCHEMA = {
  goto: { required: ["value"] },
  close: { required: [] },
  click: { required: ["selector"] },
  dblclick: { required: ["selector"] },
  type: { required: ["selector", "value"] },
  select: { required: ["selector", "value"] },
  check: { required: ["selector"] },
  uncheck: { required: ["selector"] },
  hover: { required: ["selector"] },
  drag: { required: ["selector", "value"] },
  upload: { required: ["selector", "value"] },
  screenshot: { required: [] }, // selector is optional
  eval: { required: ["value"] }, // selector is optional
  press: { required: ["value"] },
  keydown: { required: ["value"] },
  keyup: { required: ["value"] },
  mousewheel: { required: ["dx", "dy"] },
  "cookie-set": { required: ["name", "value"] },
  "cookie-get": { required: ["name"] },
  wait: { required: ["value"] },
  "wait-for": { required: ["selector"] },
  "dialog-dismiss": { required: [] },
  "dialog-accept": { required: [] }, // value is optional for prompt input
  // ── Variables ──────────────────────────────────────────────────────────────
  "var-set": { required: ["name"] }, // value is optional (can eval from selector)
  "var-get": { required: ["name"] },
  // ── Control Flow ───────────────────────────────────────────────────────────
  loop: { required: ["workflow"] }, // count or condition required (validated separately)
  "loop-elements": { required: ["selector", "workflow"] },
  if: { required: ["condition", "workflow"] },
};

const VALID_ACTIONS = Object.keys(ACTION_SCHEMA);
const VALID_CONDITIONS = ["selector-exists", "eval", "var-equals"];

/**
 * Validate the full payload.
 * @param {object} payload - The JSON body
 * @param {object} options - { requireWebhook: boolean }
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePayload(payload, options = {}) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be a JSON object."] };
  }

  // Validate webhook_url for async mode
  if (options.requireWebhook) {
    if (!payload.webhook_url || typeof payload.webhook_url !== "string") {
      errors.push(
        'Field "webhook_url" is required for async execution and must be a valid URL string.',
      );
    } else {
      try {
        new URL(payload.webhook_url);
      } catch {
        errors.push(
          `Invalid "webhook_url": "${payload.webhook_url}" is not a valid URL.`,
        );
      }
    }
  }

  // Validate workflow
  if (!Array.isArray(payload.workflow) || payload.workflow.length === 0) {
    errors.push('Field "workflow" is required and must be a non-empty array.');
    return { valid: false, errors };
  }

  // Validate each action in the workflow (recursively)
  validateWorkflowSteps(payload.workflow, "workflow", errors);

  return { valid: errors.length === 0, errors };
}

/**
 * Recursively validate workflow steps (supports nested workflows in loop/if).
 * @param {Array} steps - Array of workflow step objects
 * @param {string} pathPrefix - Path prefix for error messages
 * @param {string[]} errors - Accumulated errors array
 */
function validateWorkflowSteps(steps, pathPrefix, errors) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prefix = `${pathPrefix}[${i}]`;

    if (!step || typeof step !== "object") {
      errors.push(`${prefix}: Each workflow step must be an object.`);
      continue;
    }

    if (!step.action || typeof step.action !== "string") {
      errors.push(`${prefix}: Missing or invalid "action" field.`);
      continue;
    }

    if (!VALID_ACTIONS.includes(step.action)) {
      errors.push(
        `${prefix}: Unknown action "${step.action}". Valid actions: ${VALID_ACTIONS.join(", ")}`,
      );
      continue;
    }

    const schema = ACTION_SCHEMA[step.action];
    for (const field of schema.required) {
      if (field === "workflow") {
        // Validate nested workflow arrays
        if (!Array.isArray(step.workflow) || step.workflow.length === 0) {
          errors.push(
            `${prefix}: Action "${step.action}" requires a non-empty "workflow" array.`,
          );
        } else {
          validateWorkflowSteps(step.workflow, `${prefix}.workflow`, errors);
        }
      } else if (step[field] === undefined || step[field] === null) {
        errors.push(
          `${prefix}: Action "${step.action}" requires field "${field}".`,
        );
      }
    }

    // ── Extra validation for control flow ──────────────────────────────────
    if (step.action === "loop") {
      if (step.count === undefined && !step.condition) {
        errors.push(
          `${prefix}: Action "loop" requires either "count" or "condition".`,
        );
      }
      if (step.condition && !VALID_CONDITIONS.includes(step.condition)) {
        errors.push(
          `${prefix}: Invalid condition "${step.condition}". Valid: ${VALID_CONDITIONS.join(", ")}`,
        );
      }
    }

    if (step.action === "if") {
      if (!VALID_CONDITIONS.includes(step.condition)) {
        errors.push(
          `${prefix}: Invalid condition "${step.condition}". Valid: ${VALID_CONDITIONS.join(", ")}`,
        );
      }
      // Validate optional else block
      if (step.else !== undefined) {
        if (!Array.isArray(step.else) || step.else.length === 0) {
          errors.push(
            `${prefix}: "else" must be a non-empty array if provided.`,
          );
        } else {
          validateWorkflowSteps(step.else, `${prefix}.else`, errors);
        }
      }
    }
  }
}

module.exports = { validatePayload, VALID_ACTIONS };
