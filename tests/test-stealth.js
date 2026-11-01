const assert = require('assert');
const { executeWorkflow } = require('../src/executor');

async function testStealth() {
  console.log('Testing WebGL Spoofing and Human Simulation...');

  const htmlData = `data:text/html,<html>
    <body>
      <input id="testInput" type="text" />
      <button id="testBtn" onclick="window.clicked = true">Click Me</button>
    </body>
  </html>`;

  const payload = {
    config: {
      headless: true,
      humanize: true,
    },
    workflow: [
      {
        action: 'goto',
        value: htmlData,
      },
      {
        action: 'eval',
        value: `
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          const ext = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
          return {
            vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'none',
            renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none',
          };
        `,
      },
      {
        action: 'type',
        selector: '#testInput',
        value: 'hello',
      },
      {
        action: 'click',
        selector: '#testBtn',
      },
      {
        action: 'eval',
        value: `
          return {
            typedValue: document.querySelector('#testInput').value,
            buttonClicked: window.clicked === true
          };
        `,
      },
    ],
  };

  const startTime = Date.now();
  const res = await executeWorkflow(payload);
  const totalDuration = Date.now() - startTime;
  console.log('Execution result success:', res.success);
  console.log('Total duration:', totalDuration, 'ms');

  assert.strictEqual(res.success, true, 'Workflow should succeed');

  const evalResult = res.results[1].data.result;
  console.log('WebGL Spoofed Vendor:', evalResult.vendor);
  console.log('WebGL Spoofed Renderer:', evalResult.renderer);
  assert.strictEqual(evalResult.vendor, 'Google Inc. (NVIDIA)', 'Vendor should be spoofed');
  assert.ok(evalResult.renderer.includes('NVIDIA GeForce RTX 3060'), 'Renderer should be spoofed');

  const actionCheck = res.results[4].data.result;
  console.log('Human typing value:', actionCheck.typedValue);
  console.log('Button clicked via human cursor:', actionCheck.buttonClicked);
  assert.strictEqual(actionCheck.typedValue, 'hello');
  assert.strictEqual(actionCheck.buttonClicked, true);

  // Since 'hello' has 5 chars with 50-150ms delay each, typing alone takes at least 250ms
  console.log('All Stealth, WebGL, and Human Simulation tests passed successfully!\n');
}

testStealth().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
