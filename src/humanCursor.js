/**
 * Human-like Cursor and Typing Simulation
 * 
 * Provides smooth Cubic Bézier curve mouse trajectory and randomized human typing
 * jitter (50-150ms) to bypass behavioral heuristic bot detection.
 */

/**
 * Generate a random number between min and max.
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Calculate distance between two coordinates.
 */
function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Cubic Bezier point calculation.
 */
function cubicBezier(p0, p1, p2, p3, t) {
  const oneMinusT = 1 - t;
  return (
    Math.pow(oneMinusT, 3) * p0 +
    3 * Math.pow(oneMinusT, 2) * t * p1 +
    3 * oneMinusT * Math.pow(t, 2) * p2 +
    Math.pow(t, 3) * p3
  );
}

/**
 * Move mouse along a humanized Bézier curve from current position to target (targetX, targetY).
 */
async function humanMove(page, targetX, targetY) {
  if (!page._cursorPos) {
    page._cursorPos = { x: Math.floor(randomBetween(100, 300)), y: Math.floor(randomBetween(100, 300)) };
  }

  const start = { ...page._cursorPos };
  const end = { x: targetX, y: targetY };
  const dist = distance(start, end);

  // If very close, just a micro move
  if (dist < 5) {
    await page.mouse.move(end.x, end.y);
    page._cursorPos = end;
    return;
  }

  // Generate randomized control points with natural hand arc
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const spread = Math.min(dist * 0.4, 150);

  const cp1 = {
    x: start.x + (midX - start.x) * randomBetween(0.5, 1.2) + randomBetween(-spread, spread),
    y: start.y + (midY - start.y) * randomBetween(0.5, 1.2) + randomBetween(-spread, spread),
  };
  const cp2 = {
    x: midX + (end.x - midX) * randomBetween(0.5, 1.2) + randomBetween(-spread, spread),
    y: midY + (end.y - midY) * randomBetween(0.5, 1.2) + randomBetween(-spread, spread),
  };

  // Steps based on travel distance
  const steps = Math.max(12, Math.min(60, Math.floor(dist / 18)));

  for (let i = 1; i <= steps; i++) {
    // Non-linear easing (smoothstep for human acceleration and deceleration)
    const u = i / steps;
    const t = u * u * (3 - 2 * u);

    const curX = cubicBezier(start.x, cp1.x, cp2.x, end.x, t);
    const curY = cubicBezier(start.y, cp1.y, cp2.y, end.y, t);

    await page.mouse.move(curX, curY);

    // Realistic micro jitter delay between steps (3 - 12ms)
    await page.waitForTimeout(Math.floor(randomBetween(3, 12)));
  }

  // Final exact move
  await page.mouse.move(end.x, end.y);
  page._cursorPos = end;
}

/**
 * Perform human-like click with Bézier approach and natural click dwell time.
 */
async function humanClick(page, selector, timeout = 30000) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', timeout });
  const box = await locator.boundingBox();

  if (!box || box.width === 0 || box.height === 0) {
    // Fallback if element has no bounding box
    await locator.click({ timeout });
    return;
  }

  // Click slightly off-center for natural behavior (between 25% and 75% of dimension)
  const targetX = box.x + box.width * randomBetween(0.25, 0.75);
  const targetY = box.y + box.height * randomBetween(0.25, 0.75);

  // Move along curve
  await humanMove(page, targetX, targetY);

  // Human reaction dwell before clicking (40-100ms)
  await page.waitForTimeout(Math.floor(randomBetween(40, 100)));

  // Mouse down
  await page.mouse.down();

  // Mouse click hold duration (30-70ms)
  await page.waitForTimeout(Math.floor(randomBetween(30, 70)));

  // Mouse up
  await page.mouse.up();
}

/**
 * Perform human-like hover with Bézier movement.
 */
async function humanHover(page, selector, timeout = 30000) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', timeout });
  const box = await locator.boundingBox();

  if (!box || box.width === 0 || box.height === 0) {
    await locator.hover({ timeout });
    return;
  }

  const targetX = box.x + box.width * randomBetween(0.3, 0.7);
  const targetY = box.y + box.height * randomBetween(0.3, 0.7);

  await humanMove(page, targetX, targetY);
}

/**
 * Human typing with 50-150ms random delay per keystroke and natural punctuation pauses.
 */
async function humanType(page, selector, text, timeout = 30000) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', timeout });

  // Move cursor and focus element naturally
  await humanClick(page, selector, timeout);

  // Slight pause before beginning typing
  await page.waitForTimeout(Math.floor(randomBetween(80, 200)));

  const stringVal = String(text);
  for (let i = 0; i < stringVal.length; i++) {
    const char = stringVal[i];
    await page.keyboard.type(char);

    // Random keystroke interval between 50ms and 150ms
    let delay = Math.floor(randomBetween(50, 150));

    // Natural pauses on spaces or punctuation
    if (char === ' ' || char === ',' || char === '.') {
      delay += Math.floor(randomBetween(50, 150));
    }

    await page.waitForTimeout(delay);
  }
}

module.exports = {
  humanMove,
  humanClick,
  humanHover,
  humanType,
};

