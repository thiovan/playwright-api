/**
 * Playwright Workflow Executor
 *
 * Parses a JSON workflow array and executes each action sequentially
 * using Playwright with stealth mode enabled.
 * Supports looping, conditionals, and variables.
 */

const { chromium } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const config = require("./config");

// Register stealth plugin globally (once)
chromium.use(StealthPlugin());

/**
 * Replace placeholders like {{varName}} in a string with variable values.
 */
function interpolate(str, vars) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * Interpolate step properties that can contain templates.
 */
function recursivelyInterpolate(obj, vars) {
  if (typeof obj === 'string') {
    return interpolate(obj, vars);
  } else if (Array.isArray(obj)) {
    return obj.map(item => recursivelyInterpolate(item, vars));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = recursivelyInterpolate(obj[key], vars);
    }
    return newObj;
  }
  return obj;
}

function interpolateStep(step, vars) {
  const newStep = { ...step };
  if (newStep.value !== undefined) {
    newStep.value = recursivelyInterpolate(newStep.value, vars);
  }
  if (newStep.selector && typeof newStep.selector === 'string') {
    newStep.selector = interpolate(newStep.selector, vars);
  }
  return newStep;
}

/**
 * Execute a full workflow payload.
 *
 * @param {object} payload - The validated JSON payload
 * @returns {Promise<object>} - { success, results, variables, error?, failedAtIndex? }
 */
async function executeWorkflow(payload) {
  const browserConfig = payload.config || {};
  const workflow = payload.workflow;

  let browser = null;
  let context = null;
  let page = null;
  const results = [];
  const variables = {};

  try {
    // ── Launch browser with stealth ──────────────────────────────────
    const launchOptions = {
      headless: browserConfig.headless !== false,
    };

    if (browserConfig.proxy && browserConfig.proxy.server) {
      launchOptions.proxy = { server: browserConfig.proxy.server };
      if (browserConfig.proxy.username) {
        launchOptions.proxy.username = browserConfig.proxy.username;
        launchOptions.proxy.password = browserConfig.proxy.password || "";
      }
    }

    browser = await chromium.launch(launchOptions);

    const contextOptions = {};
    if (browserConfig.viewport) {
      contextOptions.viewport = {
        width: browserConfig.viewport.width || 1280,
        height: browserConfig.viewport.height || 720,
      };
    } else {
      contextOptions.viewport = { width: 1280, height: 720 };
    }

    if (browserConfig.userAgent) {
      contextOptions.userAgent = browserConfig.userAgent;
    }

    context = await browser.newContext(contextOptions);
    
    if (browserConfig.noMedia) {
      await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'fetch'].includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });
    }
    
    page = await context.newPage();

    // ── Execute workflow steps recursively ──────────────────────────
    const execResult = await executeSteps(workflow, page, context, variables, results, 0);
    
    const formatRes = (success, results, vars, extra = {}) => {
      const finalVars = { ...vars };
      if (browserConfig.debug === false) {
        for (const key in finalVars) {
          if (key.startsWith('_')) delete finalVars[key];
        }
      }
      const res = { success, ...extra, variables: finalVars };
      if (browserConfig.debug !== false) res.results = results;
      return res;
    };

    if (!execResult.success) {
      return formatRes(false, results, variables, {
        error: execResult.error,
        failedAtIndex: execResult.failedAtIndex,
      });
    }

    return formatRes(true, results, variables);
  } catch (err) {
    const finalVars = { ...variables };
    if (browserConfig.debug === false) {
      for (const key in finalVars) {
        if (key.startsWith('_')) delete finalVars[key];
      }
    }
    const res = {
      success: false,
      variables: finalVars,
      error: `Unexpected error: ${err.message}`,
      failedAtIndex: results.length,
    };
    if (browserConfig.debug !== false) res.results = results;
    return res;
  } finally {
    try { if (context) await context.close(); } catch { /* ignore */ }
    try { if (browser) await browser.close(); } catch { /* ignore */ }
  }
}

/**
 * Evaluate a condition.
 */
async function evaluateCondition(condition, page, step, vars) {
  const timeout = config.actionTimeout;
  if (condition === "selector-exists") {
    try {
      const el = await page.waitForSelector(step.selector, { timeout: 2000, state: 'attached' });
      return !!el;
    } catch {
      return false;
    }
  } else if (condition === "eval") {
    const val = interpolateStep(step, vars).value;
    return await page.evaluate(new Function(val));
  } else if (condition === "var-equals") {
    const expected = interpolate(step.value, vars);
    return vars[step.name] === expected;
  }
  throw new Error(`Unknown condition: ${condition}`);
}

/**
 * Execute an array of steps.
 */
async function executeSteps(steps, page, context, variables, results, startIndex) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const globalIndex = startIndex + i;
    
    const stepResult = await executeAction(page, context, step, globalIndex, variables, results);
    
    if (stepResult && stepResult.error) {
      return { success: false, error: stepResult.error, failedAtIndex: globalIndex };
    }
  }
  return { success: true };
}

/**
 * Execute a single workflow action.
 */
async function executeAction(page, context, rawStep, index, variables, results) {
  const step = interpolateStep(rawStep, variables);
  const { action, selector, value } = step;
  const timeout = config.actionTimeout;

  try {
    switch (action) {
      // ── Variables ───────────────────────────────────────────────────
      case "var-set": {
        let val = value;
        if (selector) {
           val = await page.locator(selector).evaluate(new Function("el", value), { timeout });
        } else if (typeof value === 'string' && value.startsWith('return ')) {
           val = await page.evaluate(new Function(value));
        }
        if (step.push) {
          if (!Array.isArray(variables[step.name])) {
            variables[step.name] = variables[step.name] !== undefined ? [variables[step.name]] : [];
          }
          variables[step.name].push(val);
        } else {
          variables[step.name] = val;
        }
        results.push({ action, index, data: { name: step.name, value: val } });
        break;
      }
      
      case "var-get": {
        results.push({ action, index, data: { name: step.name, value: variables[step.name] } });
        break;
      }

      // ── Control Flow ────────────────────────────────────────────────
      case "if": {
        const isTrue = await evaluateCondition(step.condition, page, step, variables);
        results.push({ action, index, data: { condition: step.condition, result: isTrue } });
        
        const branch = isTrue ? step.workflow : step.else;
        if (branch && branch.length > 0) {
           const subRes = await executeSteps(branch, page, context, variables, results, index + 1);
           if (!subRes.success) return { error: subRes.error };
        }
        break;
      }

      case "loop": {
        let iterations = 0;
        const max = config.loopMaxIterations || 1000;
        results.push({ action, index, data: { loop: 'started' } });
        
        while (iterations < max) {
          if (step.count !== undefined) {
             if (iterations >= step.count) break;
          } else if (step.condition) {
             const isTrue = await evaluateCondition(step.condition, page, step, variables);
             if (!isTrue) break;
          } else {
             break; // safety
          }
          
          variables['_index'] = iterations;
          const subRes = await executeSteps(step.workflow, page, context, variables, results, index + 1 + (iterations * step.workflow.length));
          if (!subRes.success) return { error: subRes.error };
          iterations++;
        }
        
        results.push({ action: "loop-end", index, data: { iterations } });
        break;
      }

      case "loop-elements": {
        const elementsCount = await page.locator(selector).count();
        const limit = step.max !== undefined ? Math.min(elementsCount, parseInt(step.max, 10)) : elementsCount;
        
        results.push({ action, index, data: { loopElements: 'started', found: elementsCount, limit } });
        
        for (let i = 0; i < limit; i++) {
          variables['_index'] = i;
          variables['_selector'] = `${selector} >> nth=${i}`;
          
          const subRes = await executeSteps(step.workflow, page, context, variables, results, index + 1 + (i * step.workflow.length));
          if (!subRes.success) return { error: subRes.error };
        }
        
        results.push({ action: "loop-elements-end", index, data: { iterated: limit } });
        break;
      }

      // ── Navigation ──────────────────────────────────────────────────
      case "goto": {
        await page.goto(value, { timeout, waitUntil: "domcontentloaded" });
        results.push({ action, index, data: { url: page.url() } });
        break;
      }

      case "close": {
        await page.close();
        results.push({ action, index, data: null });
        break;
      }

      // ── Interactions ────────────────────────────────────────────────
      case "click": {
        await page.locator(selector).click({ timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "dblclick": {
        await page.locator(selector).dblclick({ timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "type": {
        await page.locator(selector).fill(value, { timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "select": {
        await page.locator(selector).selectOption(value, { timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "check": {
        await page.locator(selector).check({ timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "uncheck": {
        await page.locator(selector).uncheck({ timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "hover": {
        await page.locator(selector).hover({ timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "drag": {
        const source = page.locator(selector);
        const target = page.locator(value);
        await source.dragTo(target, { timeout });
        results.push({ action, index, data: null });
        break;
      }

      case "upload": {
        await page.locator(selector).setInputFiles(value, { timeout });
        results.push({ action, index, data: null });
        break;
      }

      // ── Output ──────────────────────────────────────────────────────
      case "get-text": {
        const text = await page.locator(selector).textContent({ timeout });
        const resultText = text ? text.trim() : null;
        if (step.name) {
          if (step.push) {
            if (!Array.isArray(variables[step.name])) variables[step.name] = variables[step.name] !== undefined ? [variables[step.name]] : [];
            variables[step.name].push(resultText);
          } else {
            variables[step.name] = resultText;
          }
        }
        results.push({ action, index, data: { text: resultText } });
        break;
      }

      case "get-attribute": {
        const attr = await page.locator(selector).getAttribute(value, { timeout });
        if (step.name) {
          if (step.push) {
            if (!Array.isArray(variables[step.name])) variables[step.name] = variables[step.name] !== undefined ? [variables[step.name]] : [];
            variables[step.name].push(attr);
          } else {
            variables[step.name] = attr;
          }
        }
        results.push({ action, index, data: { attribute: attr } });
        break;
      }

      case "screenshot": {
        let buffer;
        if (selector) {
          buffer = await page.locator(selector).screenshot({ timeout });
        } else {
          buffer = await page.screenshot({ fullPage: false, timeout });
        }
        const base64 = buffer.toString("base64");
        results.push({ action, index, data: { screenshot: base64 } });
        break;
      }

      case "eval": {
        let result;
        if (selector) {
          result = await page.locator(selector).evaluate(new Function("el", value), { timeout });
        } else {
          result = await page.evaluate(new Function(value));
        }
        results.push({ action, index, data: { result } });
        break;
      }

      // ── Keyboard ────────────────────────────────────────────────────
      case "press": {
        await page.keyboard.press(value);
        results.push({ action, index, data: null });
        break;
      }

      case "keydown": {
        await page.keyboard.down(value);
        results.push({ action, index, data: null });
        break;
      }

      case "keyup": {
        await page.keyboard.up(value);
        results.push({ action, index, data: null });
        break;
      }

      // ── Mouse ───────────────────────────────────────────────────────
      case "mousewheel": {
        const dx = step.dx || 0;
        const dy = step.dy || 0;
        await page.mouse.wheel(dx, dy);
        results.push({ action, index, data: null });
        break;
      }

      // ── Cookies ─────────────────────────────────────────────────────
      case "cookie-set": {
        const url = page.url();
        await context.addCookies([{ name: step.name, value: step.value, url }]);
        results.push({ action, index, data: null });
        break;
      }

      case "cookie-get": {
        const cookies = await context.cookies();
        const cookie = cookies.find((c) => c.name === step.name) || null;
        results.push({ action, index, data: { cookie } });
        break;
      }

      // ── Wait ────────────────────────────────────────────────────────
      case "wait": {
        const ms = parseInt(value, 10);
        await page.waitForTimeout(ms);
        results.push({ action, index, data: null });
        break;
      }

      case "wait-for": {
        await page.waitForSelector(selector, { timeout });
        results.push({ action, index, data: null });
        break;
      }

      // ── Dialogs ─────────────────────────────────────────────────────
      case "dialog-dismiss": {
        page.once('dialog', async dialog => {
          await dialog.dismiss();
        });
        results.push({ action, index, data: null });
        break;
      }

      case "dialog-accept": {
        page.once('dialog', async dialog => {
          await dialog.accept(value || undefined);
        });
        results.push({ action, index, data: null });
        break;
      }

      default: {
        return { error: `Unknown action: "${action}"` };
      }
    }
  } catch (err) {
    return { error: `Action "${action}" failed at step ${index}: ${err.message}` };
  }
}

module.exports = { executeWorkflow };
