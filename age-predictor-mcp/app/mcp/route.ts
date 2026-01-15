import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(async (server) => {
  const WIDGET_URI = "ui://widget/age-predictor.html";

  server.registerResource(
    "age-widget",
    WIDGET_URI,
    {
      title: "Age Predictor",
      mimeType: "text/html+skybridge",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/html+skybridge",
        text: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: transparent;">
            <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #10b981; text-align: center; min-width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="font-size: 0.8rem; color: #6b7280; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Predicted Age for</div>
              <div id="name" style="font-size: 1.6rem; font-weight: 800; color: #111827; margin: 8px 0;">Searching...</div>
              <div id="age" style="font-size: 4.5rem; font-weight: 900; color: #10b981; line-height: 1;">--</div>
              <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                Based on <span id="count">0</span> records
              </div>
            </div>

            <script>
              function updateUI(output) {
                if (!output) return;
                // Agify returns data in various structures; we handle both
                const name = output.name || "Unknown";
                const age = output.age || "??";
                const count = output.count || 0;

                document.getElementById('name').innerText = name;
                document.getElementById('age').innerText = age;
                document.getElementById('count').innerText = count.toLocaleString();
              }

              // OFFICIAL METHOD: Check the injected openai object
              function init() {
                if (window.openai && window.openai.toolOutput) {
                   updateUI(window.openai.toolOutput);
                } else {
                   // Fallback for different host implementations
                   window.addEventListener('message', (event) => {
                     if (event.data?.structuredContent) {
                       updateUI(event.data.structuredContent);
                     }
                   });
                }
              }

              // Run on load
              window.onload = init;
            </script>
          </body>
          </html>
        `,
      }],
    })
  );

  server.registerTool(
    "predict_age",
    {
      title: "Predict Age",
      description: "Predicts the age of a person based on their name.",
      inputSchema: {
        name: z.string().describe("The name to analyze"),
      },
      _meta: {
        "openai/outputTemplate": WIDGET_URI,
        "openai/resultCanProduceWidget": true,
      },
    },
    async ({ name }) => {
      const res = await fetch(`https://api.agify.io/?name=${encodeURIComponent(name)}`);
      const data = await res.json();

      return {
        content: [{ type: "text", text: `I predict ${name} is ${data.age} years old.` }],
        structuredContent: {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          age: data.age,
          count: data.count
        },
        _meta: {
          "openai/outputTemplate": WIDGET_URI,
          "openai/resultCanProduceWidget": true,
        },
      };
    }
  );
});

export const GET = handler;
export const POST = handler;