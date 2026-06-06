const fs = require("fs");
const path = require("path");

const payload = {
  config: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  },
  workflow: [
    // 1. Navigation & Evaluation
    { action: "goto", value: "https://the-internet.herokuapp.com/" },
    { action: "eval", value: "return document.title" },
    
    // 2. Checkboxes
    { action: "goto", value: "https://the-internet.herokuapp.com/checkboxes" },
    { action: "wait-for", selector: "#checkboxes" },
    { action: "check", selector: "input[type='checkbox']:first-child" },
    { action: "uncheck", selector: "input[type='checkbox']:last-child" },
    
    // 3. Dropdown
    { action: "goto", value: "https://the-internet.herokuapp.com/dropdown" },
    { action: "select", selector: "#dropdown", value: "1" },
    
    // 4. Inputs & Keyboard
    { action: "goto", value: "https://the-internet.herokuapp.com/inputs" },
    { action: "type", selector: "input[type='number']", value: "12345" },
    { action: "press", value: "Enter" },
    { action: "keydown", value: "Shift" },
    { action: "keyup", value: "Shift" },
    
    // 5. Mouse Interaction
    { action: "goto", value: "https://the-internet.herokuapp.com/hovers" },
    { action: "hover", selector: ".figure:first-of-type" },
    { action: "mousewheel", dx: 0, dy: 200 },
    
    // 6. Drag and Drop
    { action: "goto", value: "https://the-internet.herokuapp.com/drag_and_drop" },
    { action: "drag", selector: "#column-a", value: "#column-b" },
    
    // 7. Cookies
    { action: "cookie-set", name: "test_cookie", value: "test_value" },
    { action: "cookie-get", name: "test_cookie" },
    
    // 8. Wait & Output
    { action: "wait", value: 1000 },
    { action: "screenshot" }
  ],
};

async function testAll() {
  console.log("Sending comprehensive test request to Playwright API sync endpoint...");
  console.log("This will test: goto, eval, wait-for, check, uncheck, select, type, press, keydown, keyup, hover, mousewheel, drag, cookie-set, cookie-get, wait, screenshot");
  
  try {
    const startTime = Date.now();
    const response = await fetch("http://localhost:3000/api/v1/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\nResponse Status: ${response.status}`);
    console.log(`Execution Time: ${duration}s`);
    console.log(`Success: ${result.success}`);

    if (result.success) {
      console.log("\n--- Action Results ---");
      result.results.forEach(r => {
        let extraInfo = "";
        if (r.data) {
           if (r.data.url) extraInfo = ` -> ${r.data.url}`;
           else if (r.data.result) extraInfo = ` -> Result: ${JSON.stringify(r.data.result)}`;
           else if (r.data.cookie) extraInfo = ` -> Cookie: ${JSON.stringify(r.data.cookie)}`;
           else if (r.data.screenshot) extraInfo = ` -> [Screenshot Data: ${r.data.screenshot.length} bytes]`;
        }
        console.log(`[Step ${r.index}] ${r.action}${extraInfo}`);
      });

      // Save the final screenshot
      const screenshotStep = result.results.find((r) => r.action === "screenshot");
      if (screenshotStep && screenshotStep.data && screenshotStep.data.screenshot) {
        const buffer = Buffer.from(screenshotStep.data.screenshot, "base64");
        const outputPath = path.join(__dirname, "test_all_features.png");
        fs.writeFileSync(outputPath, buffer);
        console.log(`\nScreenshot saved successfully to: ${outputPath}`);
      }
      console.log("\n✅ All features tested successfully!");
    } else {
      console.error("\n❌ Error execution:", result.error);
      console.error("Failed at index:", result.failedAtIndex);
    }
  } catch (error) {
    console.error("\n❌ Failed to connect or parse response:", error);
  }
}

testAll();
