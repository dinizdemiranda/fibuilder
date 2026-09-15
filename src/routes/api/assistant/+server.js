// Thin OpenAI proxy — the only server code this project has. Accepts the
// running chat transcript (the client owns building the system message with
// a fresh page snapshot every round, since `doc` only exists in the
// browser), calls OpenAI with the secret key, and re-streams a small
// normalized SSE schema (text-delta / tool-call / done / error) instead of
// raw OpenAI chunks — keeps the client parser simple and insulated from the
// SDK's own wire format.
//
// Tool EXECUTION never happens here — this route only asks OpenAI which
// tool to call and with what arguments; the browser is what actually runs
// it against the live page (see runTool.js). See the "Architecture" section
// of the plan this was built from for why that split is required, not just
// a style choice.

import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { TOOL_DEFS } from '$lib/builder/assistant/tools.js';

// A current, strong tool-calling OpenAI model. Verify this is still current
// against OpenAI's model list if it's been a while — it's a one-line change.
const MODEL = 'gpt-5-mini';

// gpt-5-family models are reasoning models — left at their default effort
// they spend a hidden reasoning pass before *every* response, which is
// costly here specifically because this architecture is one round trip per
// tool call (parallel_tool_calls: false), so that cost compounds per step
// instead of being paid once. "minimal" all but disables that pass, trading
// deeper reasoning for latency — the right trade for a narrow, well-typed
// tool surface like this one. Only gpt-5-family models accept this param.
const REASONING_EFFORT = MODEL.startsWith('gpt-5') ? 'minimal' : undefined;

const tools = TOOL_DEFS.map((def) => ({
	type: 'function',
	function: { name: def.name, description: def.description, parameters: def.parameters }
}));

function sseEvent(obj) {
	return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST({ request }) {
	if (!env.OPENAI_API_KEY) {
		return json({ error: 'OPENAI_API_KEY is not set on the server. Add it to .env and restart the dev server.' }, { status: 500 });
	}

	const { messages } = await request.json();
	if (!Array.isArray(messages) || messages.length === 0) {
		return json({ error: '"messages" must be a non-empty array.' }, { status: 400 });
	}

	const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

	const stream = new ReadableStream({
		async start(controller) {
			const enqueue = (obj) => controller.enqueue(new TextEncoder().encode(sseEvent(obj)));
			try {
				const completion = await client.chat.completions.create({
					model: MODEL,
					messages,
					tools,
					tool_choice: 'auto',
					parallel_tool_calls: false,
					stream: true,
					// The usage chunk arrives last, after finish_reason, with an
					// empty choices array — the loop below checks chunk.usage
					// before the choices?.[0] guard so it isn't skipped.
					stream_options: { include_usage: true },
					...(REASONING_EFFORT ? { reasoning_effort: REASONING_EFFORT } : {})
				});

				// Accumulated across chunks, keyed by the tool call's index in
				// this turn (OpenAI streams a tool call's name once, then its
				// JSON-stringified arguments in fragments).
				const toolCalls = [];
				let finishReason = null;

				for await (const chunk of completion) {
					if (chunk.usage) enqueue({ type: 'usage', usage: chunk.usage });
					const choice = chunk.choices?.[0];
					if (!choice) continue;
					const delta = choice.delta ?? {};

					if (delta.content) enqueue({ type: 'text-delta', delta: delta.content });

					if (delta.tool_calls) {
						for (const tc of delta.tool_calls) {
							const i = tc.index ?? 0;
							if (!toolCalls[i]) toolCalls[i] = { id: '', name: '', arguments: '' };
							if (tc.id) toolCalls[i].id = tc.id;
							if (tc.function?.name) toolCalls[i].name += tc.function.name;
							if (tc.function?.arguments) toolCalls[i].arguments += tc.function.arguments;
						}
					}

					if (choice.finish_reason) finishReason = choice.finish_reason;
				}

				for (const tc of toolCalls) {
					if (!tc?.id) continue;
					let parsedArgs;
					try {
						parsedArgs = tc.arguments ? JSON.parse(tc.arguments) : {};
					} catch {
						enqueue({ type: 'error', message: `Model produced invalid JSON arguments for tool "${tc.name}".` });
						continue;
					}
					enqueue({ type: 'tool-call', id: tc.id, name: tc.name, arguments: parsedArgs });
				}

				enqueue({ type: 'done', finishReason: finishReason ?? 'stop' });
			} catch (err) {
				enqueue({ type: 'error', message: err instanceof Error ? err.message : String(err) });
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
