// Turns a free-form brain dump into a short list of structured tasks.
// The Anthropic API key stays server-side (Netlify env var) — never sent to the browser.
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server not configured" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return { statusCode: 400, body: JSON.stringify({ error: "Missing text" }) };
  if (text.length > 4000) return { statusCode: 400, body: JSON.stringify({ error: "Too long" }) };

  const systemPrompt =
    "You turn a person's free-form brain dump into a short list of concrete tasks for their personal " +
    "life-tracking app, Kae Ops. Buckets available: clients, content, money, movement, or null for general. " +
    "Time windows: \"today\" (do it today), \"week\" (sometime this week, no specific day), or \"later\" " +
    "(unscheduled / someday). Respond with ONLY valid JSON, no prose, no markdown fences, matching exactly " +
    "this shape: {\"tasks\":[{\"title\": string, \"bucket\": \"clients\"|\"content\"|\"money\"|\"movement\"|null, " +
    "\"time\": \"today\"|\"week\"|\"later\"}]}. Keep titles short and actionable (imperative, under 60 characters). " +
    "Produce at most 8 tasks. If the input names no concrete actions, return {\"tasks\":[]}.";

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: text }]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic API error", resp.status, errText);
      return { statusCode: 502, body: JSON.stringify({ error: "Upstream error" }) };
    }

    const data = await resp.json();
    const textBlock = (data.content || []).find(function (b) { return b.type === "text"; });
    const raw = textBlock ? textBlock.text : "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch (e2) { parsed = null; }
      }
    }
    if (!parsed || !Array.isArray(parsed.tasks)) {
      return { statusCode: 502, body: JSON.stringify({ error: "Could not parse model output" }) };
    }

    const validBuckets = ["clients", "content", "money", "movement", null];
    const validTimes = ["today", "week", "later"];
    const tasks = parsed.tasks
      .filter(function (t) { return t && typeof t.title === "string" && t.title.trim(); })
      .slice(0, 8)
      .map(function (t) {
        return {
          title: t.title.trim().slice(0, 120),
          bucket: validBuckets.indexOf(t.bucket) !== -1 ? t.bucket : null,
          time: validTimes.indexOf(t.time) !== -1 ? t.time : "later"
        };
      });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tasks: tasks })
    };
  } catch (e) {
    console.error("chat function error", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
