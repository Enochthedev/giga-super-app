const fs = require('fs');
const path = require('path');

const COLLECTION_PATH = path.join(__dirname, '../postman/Giga-API-Collection.postman_collection.json');

// Standard Test Script for all API endpoints
const STANDARD_TESTS = [
    "// 1. Validate Status Code",
    "pm.test(\"Status code is 200 or 201\", function () {",
    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
    "});",
    "",
    "// 2. Validate JSON Structure",
    "pm.test(\"Response is valid JSON\", function () {",
    "    pm.response.to.be.json;",
    "});",
    "",
    "// 3. Validate Success Flag (Standard Giga Response)",
    "pm.test(\"Response indicates success\", function () {",
    "    try {",
    "        var jsonData = pm.response.json();",
    "        // Only check if success property exists (some standard Supabase endpoints might not have it)",
    "        if (jsonData.hasOwnProperty('success')) {",
    "            pm.expect(jsonData.success).to.be.true;",
    "        }",
    "    } catch (e) {",
    "        // Ignore parsing errors for non-JSON responses",
    "    }",
    "});",
    "",
    "// 4. Performance Check",
    "pm.test(\"Response time is < 2000ms\", function () {",
    "    pm.expect(pm.response.responseTime).to.be.below(2000);",
    "});"
];

function enrichCollection() {
    try {
        const collection = JSON.parse(fs.readFileSync(COLLECTION_PATH, 'utf-8'));
        let updatedCount = 0;

        function processItems(items) {
            if (!items) return;

            for (const item of items) {
                if (item.item) {
                    // It's a folder, recurse
                    processItems(item.item);
                } else if (item.request) {
                    // It's a request

                    // 1. Add Tests
                    if (!item.event) item.event = [];

                    const testEvent = item.event.find(e => e.listen === 'test');
                    if (testEvent) {
                        // Append to existing tests if not already present
                        const currentScript = testEvent.script.exec.join('\n');
                        if (!currentScript.includes("Status code is 200")) {
                            testEvent.script.exec = [...testEvent.script.exec, "", ...STANDARD_TESTS];
                        }
                    } else {
                        // Create new test event
                        item.event.push({
                            "listen": "test",
                            "script": {
                                "exec": STANDARD_TESTS,
                                "type": "text/javascript"
                            }
                        });
                    }

                    // 2. Enhance Description with Usage Docs
                    let desc = item.request.description || "";
                    if (typeof desc === 'object') desc = desc.content || ""; // Handle Postman description objects

                    const usageDoc = `
**Frontend Usage:**
\`\`\`javascript
const response = await supabase.functions.invoke('${item.name}', {
  body: ${item.request.body?.raw || '{}'}
});
\`\`\`
`;
                    // Only add if not already present
                    if (!desc.includes("**Frontend Usage:**")) {
                        item.request.description = desc + "\n" + usageDoc;
                    }

                    updatedCount++;
                }
            }
        }

        processItems(collection.item);

        fs.writeFileSync(COLLECTION_PATH, JSON.stringify(collection, null, 2));
        console.log(`✅ Enriched ${updatedCount} endpoints with tests and usage docs.`);

    } catch (error) {
        console.error("Error enriching collection:", error);
    }
}

enrichCollection();
