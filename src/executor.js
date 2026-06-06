/**
 * Playwright Workflow Executor
 *
 * Parses a JSON workflow array and executes each action sequentially
 * using Playwright with stealth mode enabled.
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('./config');

// Register stealth plugin globally (once)
chromium.use(StealthPlugin());

/**
 * Execute a full workflow payload.
 *
 * @param {object} payload - The validated JSON payload
 * @param {object} payload.config - Browser configuration (optional)
 * @param {Array}  payload.workflow - Array of action steps
 * @returns {Promise<object>} - { success, results, error?, failedAtIndex? }
 */
async function executeWorkflow(payload) {
  const browserConfig = payload.config || {};
  const workflow = payload.workflow;

  let browser = null;
  let context = null;
  let page = null;
  const results = [];

  try {
    // ── Launch browser with stealth ──────────────────────────────────
    const launchOptions = {
      headless: browserConfig.headless !== false, // default true
    };

    if (browserConfig.proxy && browserConfig.proxy.server) {
      launchOptions.proxy = { server: browserConfig.proxy.server };
      if (browserConfig.proxy.username) {
        launchOptions.proxy.username = browserConfig.proxy.username;
        launchOptions.proxy.password = browserConfig.proxy.password || '';
      }
    }

    browser = await chromium.launch(launchOptions);

    // ── Create isolated browser context ─────────────────────────────
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
    page = await context.newPage();

    // ── Execute workflow steps sequentially ──────────────────────────
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      const stepResult = await executeAction(page, context, step, i);
      results.push(stepResult);

      // If this step produced an error, stop execution
      if (stepResult.error) {
        return {
          success: false,
          results,
          error: stepResult.error,
          failedAtIndex: i,
        };
      }
    }

    return { success: true, results };
  } catch (err) {
    return {
      success: false,
      results,
      error: `Unexpected error: ${err.message}`,
      failedAtIndex: results.length,
    };
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────
    try {
      if (context) await context.close();
    } catch { /* ignore */ }
    try {
      if (browser) await browser.close();
    } catch { /* ignore */ }
  }
}

/**
 * Execute a single workflow action.
 *
 * @param {import('playwright').Page} page
 * @param {import('playwright').BrowserContext} context
 * @param {object} step - The action step object
 * @param {number} index - Step index for logging
 * @returns {Promise<object>} - { action, index, data?, error? }
 */
async function executeAction(page, context, step, index) {
  const { action, selector, value } = step;
  const timeout = config.actionTimeout;

  try {
    switch (action) {
      // ── Navigation ──────────────────────────────────────────────────
      case 'goto': {
        await page.goto(value, { timeout, waitUntil: 'domcontentloaded' });
        return { action, index, data: { url: page.url() } };
      }

      case 'close': {
        await page.close();
        // Create a fresh page for potential subsequent steps
        page = await context.newPage();
        return { action, index, data: null };
      }

      // ── Interactions ────────────────────────────────────────────────
      case 'click': {
        await page.locator(selector).click({ timeout });
        return { action, index, data: null };
      }

      case 'dblclick': {
        await page.locator(selector).dblclick({ timeout });
        return { action, index, data: null };
      }

      case 'type': {
        await page.locator(selector).fill(value, { timeout });
        return { action, index, data: null };
      }

      case 'select': {
        await page.locator(selector).selectOption(value, { timeout });
        return { action, index, data: null };
      }

      case 'check': {
        await page.locator(selector).check({ timeout });
        return { action, index, data: null };
      }

      case 'uncheck': {
        await page.locator(selector).uncheck({ timeout });
        return { action, index, data: null };
      }

      case 'hover': {
        await page.locator(selector).hover({ timeout });
        return { action, index, data: null };
      }

      case 'drag': {
        const source = page.locator(selector);
        const target = page.locator(value);
        await source.dragTo(target, { timeout });
        return { action, index, data: null };
      }

      case 'upload': {
        await page.locator(selector).setInputFiles(value, { timeout });
        return { action, index, data: null };
      }

      // ── Output ──────────────────────────────────────────────────────
      case 'screenshot': {
        let buffer;
        if (selector) {
          buffer = await page.locator(selector).screenshot({ timeout });
        } else {
          buffer = await page.screenshot({ fullPage: false, timeout });
        }
        const base64 = buffer.toString('base64');
        return { action, index, data: { screenshot: base64 } };
      }

      case 'eval': {
        let result;
        if (selector) {
          result = await page.locator(selector).evaluate(
            new Function('el', value),
            { timeout }
          );
        } else {
          result = await page.evaluate(new Function(value));
        }
        return { action, index, data: { result } };
      }

      // ── Keyboard ────────────────────────────────────────────────────
      case 'press': {
        await page.keyboard.press(value);
        return { action, index, data: null };
      }

      case 'keydown': {
        await page.keyboard.down(value);
        return { action, index, data: null };
      }

      case 'keyup': {
        await page.keyboard.up(value);
        return { action, index, data: null };
      }

      // ── Mouse ───────────────────────────────────────────────────────
      case 'mousewheel': {
        const dx = step.dx || 0;
        const dy = step.dy || 0;
        await page.mouse.wheel(dx, dy);
        return { action, index, data: null };
      }

      // ── Cookies ─────────────────────────────────────────────────────
      case 'cookie-set': {
        const url = page.url();
        await context.addCookies([{
          name: step.name,
          value: step.value,
          url: url,
        }]);
        return { action, index, data: null };
      }

      case 'cookie-get': {
        const cookies = await context.cookies();
        const cookie = cookies.find(c => c.name === step.name) || null;
        return { action, index, data: { cookie } };
      }

      // ── Wait ────────────────────────────────────────────────────────
      case 'wait': {
        const ms = parseInt(value, 10);
        await page.waitForTimeout(ms);
        return { action, index, data: null };
      }

      case 'wait-for': {
        await page.waitForSelector(selector, { timeout });
        return { action, index, data: null };
      }

      default: {
        return { action, index, error: `Unknown action: "${action}"` };
      }
    }
  } catch (err) {
    return {
      action,
      index,
      error: `Action "${action}" failed at step ${index}: ${err.message}`,
    };
  }
}

module.exports = { executeWorkflow };
