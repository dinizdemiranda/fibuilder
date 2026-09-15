<script>
	// The AI assistant chat tab. Orchestrates the round-trip loop described
	// in the plan: build [system+snapshot, ...transcript] -> POST
	// /api/assistant -> stream back text/tool-calls -> execute each tool
	// call locally against the live `doc` (the canvas updates immediately,
	// reactively, since doc is $state) -> repost the tool results as the
	// next round -> repeat until the model replies with plain text and no
	// more tool calls.
	import { doc } from './state.svelte.js';
	import { buildDocSnapshot } from './assistant/snapshot.js';
	import { SYSTEM_PROMPT } from './assistant/systemPrompt.js';
	import { runTool } from './assistant/runTool.js';
	import { logApiResponse } from './assistant/apiLog.svelte.js';
	import Icon from './Icon.svelte';

	const MAX_ROUNDS = 25;

	// UI-facing transcript — richer than the wire format: an assistant turn
	// is one growing entry whose `parts` interleave streamed text chunks and
	// tool-step narrations in the order they actually happened, possibly
	// across several rounds, so the whole turn reads as one continuous
	// "here's what I'm doing" bubble.
	let messages = $state([]);
	// The OpenAI wire-format transcript, resent (with a fresh system message)
	// every round — the server holds no session of its own.
	let wireMessages = $state([]);
	let input = $state('');
	let busy = $state(false);
	let error = $state('');
	let abortController = null;
	let messagesEl = $state(null);
	// Cumulative across every round of every turn this tab has run — reset
	// only on a real page reload, not on tab switches (this component stays
	// mounted, see Library.svelte's `hidden` toggle rather than {#if}).
	let sessionUsage = $state({ prompt: 0, completion: 0, total: 0 });

	$effect(() => {
		// Re-run whenever the rendered message count/content changes (Svelte
		// tracks messages[].length and nested part pushes via the $state
		// proxy) — keep the newest content in view.
		messages.length;
		if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
	});

	// Everything the loop does, logged to the browser console under one
	// collapsible group per round — the request sent, every raw SSE event,
	// and each tool call's full args/result. Console (not a UI panel)
	// because the interesting failures here are model/schema mismatches
	// (wrong enum value, malformed refs, etc.) that are easiest to read as
	// real JSON, and because it costs nothing when nobody's looking. Each
	// tool step in the transcript itself also gets a "Details" toggle (see
	// template) for the same args/result without needing devtools open.
	const DEBUG_TAG = '[FI Assistant]';
	function debugRequest(round, body) {
		console.groupCollapsed(`${DEBUG_TAG} round ${round} → request`);
		console.log('messages sent:', body.messages);
		console.groupEnd();
	}
	function debugEvent(event) {
		console.log(`${DEBUG_TAG} sse:`, event);
	}
	function debugTool(name, args, result) {
		console.groupCollapsed(`${DEBUG_TAG} tool: ${name}${result.ok ? '' : ' (FAILED)'}`);
		console.log('args:', args);
		console.log('result:', result);
		console.groupEnd();
	}

	const TOOL_NARRATIONS = {
		add_element: (args, r) => `Added ${r.result.type} "${r.result.name}"`,
		move_element: () => 'Moved an element',
		remove_element: () => 'Removed an element',
		rename_element: (args) => `Renamed to "${args.name}"`,
		set_section_layout: () => 'Updated the section layout',
		set_grid_layout: (args) => `Resized the grid${args.columns ? ` to ${args.columns} columns` : ''}${args.rows ? ` x ${args.rows} rows` : ''}`,
		set_field_value: (args) => `Set "${args.field}" to ${JSON.stringify(args.value)}`,
		set_field_reference: (args) => `Linked "${args.field}" to another value`,
		set_field_formula: (args) => `Set "${args.field}" to a formula`,
		clear_field_binding: (args) => `Cleared the binding on "${args.field}"`,
		create_variable: (args, r) => `Created variable "${r.result.name}"`,
		remove_variable: () => 'Removed a variable',
		set_variable_value: (args) => `Set the variable to ${JSON.stringify(args.value)}`,
		set_variable_formula: () => 'Gave the variable a formula',
		add_button_control_event: (args) => `Added a click action (${args.method})`,
		add_button_set_variable_event: (args) => `Added a click action (${args.varMethod} variable)`,
		add_row_select_event: () => 'Added a row-select action',
		remove_event: () => 'Removed an event',
		set_module_data_source: (args) => `Set the data source to "${args.dataSourceId}"`,
		get_data_source_sample: (args) => `Looked up sample data for "${args.dataSourceId}"`,
		set_gallery_field: (args) => `Configured the "${args.key}" gallery field`,
		import_label: (args) => `Imported label "${args.labelId}"`,
		remove_label: (args) => `Removed label "${args.labelId}"`
	};

	function describeToolCall(name, args, result) {
		if (!result.ok) return `Couldn't ${name.replaceAll('_', ' ')} — ${result.error}`;
		const narrate = TOOL_NARRATIONS[name];
		const base = narrate ? narrate(args, result) : name.replaceAll('_', ' ');
		return result.warning ? `${base} (${result.warning})` : base;
	}

	function buildAssistantWireMessage(text, toolCalls) {
		const msg = { role: 'assistant', content: text || null };
		if (toolCalls.length) {
			msg.tool_calls = toolCalls.map((tc) => ({
				id: tc.id,
				type: 'function',
				function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
			}));
		}
		return msg;
	}

	// Parses the server's normalized SSE stream, appending text as it
	// arrives directly into `assistantEntry.parts` so the bubble grows
	// live — this is the "streamed" half of the real-time feel; the other
	// half is that tool calls execute (and the canvas updates) the instant
	// each one is parsed, not after the whole round finishes.
	async function consumeStream(response, assistantEntry) {
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let text = '';
		let currentTextPart = null;
		const toolCalls = [];
		let finishReason = 'stop';
		let streamError = null;
		let usage = null;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const chunks = buffer.split('\n\n');
			buffer = chunks.pop();
			for (const chunk of chunks) {
				const line = chunk.trim();
				if (!line.startsWith('data:')) continue;
				const payload = line.slice(5).trim();
				if (!payload) continue;
				const event = JSON.parse(payload);
				debugEvent(event);
				if (event.type === 'text-delta') {
					text += event.delta;
					if (!currentTextPart) {
						assistantEntry.parts.push({ type: 'text', text: '' });
						// Same reason as the assistantEntry fix in send(): grab the
						// reactive proxy Svelte just wrapped the pushed object in,
						// not the plain literal — every delta below mutates this
						// repeatedly, and mutating the pre-proxy object would
						// silently stop updating the UI after the first delta.
						currentTextPart = assistantEntry.parts[assistantEntry.parts.length - 1];
					}
					currentTextPart.text += event.delta;
				} else if (event.type === 'tool-call') {
					toolCalls.push(event);
					currentTextPart = null; // any later text starts a fresh bubble segment
				} else if (event.type === 'done') {
					finishReason = event.finishReason;
				} else if (event.type === 'error') {
					streamError = event.message;
				} else if (event.type === 'usage') {
					usage = event.usage;
				}
			}
		}
		return { text, toolCalls, finishReason, streamError, usage };
	}

	function groupSummary(steps) {
		const failed = steps.filter((s) => !s.ok).length;
		if (failed === steps.length) return `${steps.length} changes failed`;
		if (failed > 0) return `${steps.length} changes applied (${failed} failed)`;
		return `${steps.length} changes applied`;
	}

	// Best-effort backstop for when the model asks a decision question as
	// plain text instead of calling ask_question — the system prompt asks
	// it not to, but prompting alone isn't a guarantee. Not perfect (a
	// narrative sentence can legitimately end in "?"), but cheap and safe:
	// worst case it costs one extra round.
	const QUESTION_LIKE = /\?\s*$|do you want|would you like|choose one|which (?:one|option|approach)|let me know which|should i\b/i;
	function looksLikeQuestion(text) {
		const t = text?.trim();
		return !!t && QUESTION_LIKE.test(t);
	}

	async function runLoop(assistantEntry) {
		let round = 0;
		let consecutiveFailures = 0;
		// Consecutive tool steps (no narration text between them) collapse
		// into one summary line in the transcript instead of one line each —
		// reset to null whenever real narration text arrives, so a group
		// always corresponds to "the steps this bit of narration was about."
		let currentToolGroup = null;
		// Only ever nudge once per turn — if the model still won't use
		// ask_question after being told to, accept the plain text rather
		// than loop (and keep burning tokens) forever.
		let nudgedForQuestion = false;
		while (true) {
			round++;
			if (round > MAX_ROUNDS) {
				assistantEntry.parts.push({
					type: 'text',
					text:
						'\n\n_Paused after a long stretch of steps — nothing is lost. Say "continue" and I\'ll pick up from here.' +
						' (For a build this size, I should have broken it into smaller phases and checked in with you — I\'ll do that from here on.)_'
				});
				break;
			}
			const systemMessage = { role: 'system', content: `${SYSTEM_PROMPT}\n\n${buildDocSnapshot(doc)}` };
			const requestBody = { messages: [systemMessage, ...wireMessages] };
			debugRequest(round, requestBody);
			const res = await fetch('/api/assistant', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
				signal: abortController.signal
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || `Request failed (${res.status})`);
			}

			const partsCountBefore = assistantEntry.parts.length;
			const { text, toolCalls, finishReason, streamError, usage } = await consumeStream(res, assistantEntry);

			logApiResponse({
				round,
				requestMessageCount: requestBody.messages.length,
				text,
				toolCalls: toolCalls.map((tc) => ({ name: tc.name, arguments: tc.arguments })),
				finishReason: streamError ? 'error' : finishReason,
				error: streamError,
				usage
			});

			if (streamError) throw new Error(streamError);

			if (usage) {
				sessionUsage.prompt += usage.prompt_tokens ?? 0;
				sessionUsage.completion += usage.completion_tokens ?? 0;
				sessionUsage.total += usage.total_tokens ?? 0;
				console.log(`${DEBUG_TAG} usage this round:`, usage, 'session total:', { ...sessionUsage });
			}

			wireMessages.push(buildAssistantWireMessage(text, toolCalls));
			if (text) currentToolGroup = null;

			if (!toolCalls.length) {
				if (!nudgedForQuestion && looksLikeQuestion(text)) {
					nudgedForQuestion = true;
					// Pull back the raw text bubble we just rendered — it's about
					// to be replaced by a proper ask_question call (or, worst
					// case, by the same text again next round, in which case
					// nothing is lost).
					assistantEntry.parts.length = partsCountBefore;
					wireMessages.push({
						role: 'system',
						content:
							'That last reply reads like a question for the user (asking them to pick or confirm something), but it was sent as plain text. Call the ask_question tool now with that same question — do not send it as plain text again.'
					});
					continue;
				}
				break; // plain text reply — this turn is over
			}

			let askedQuestion = false;
			for (const tc of toolCalls) {
				const result = runTool(tc.name, tc.arguments);
				debugTool(tc.name, tc.arguments, result);
				wireMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });

				if (tc.name === 'ask_question') {
					// A real decision point, not a build step — its own distinct
					// bubble (see template), and it ends the turn: no more rounds
					// until the user actually answers.
					assistantEntry.parts.push({
						type: 'question',
						question: result.result.question,
						options: result.result.options,
						answered: false
					});
					currentToolGroup = null;
					askedQuestion = true;
					continue;
				}

				if (tc.name === 'present_plan') {
					// A stylized step list instead of the model writing the plan
					// out as prose — doesn't pause the loop the way ask_question
					// does, since the model is expected to move straight into
					// phase 1's own tool calls next.
					if (result.ok) assistantEntry.parts.push({ type: 'plan', phases: result.result.phases });
					currentToolGroup = null;
					continue;
				}

				if (!currentToolGroup) {
					assistantEntry.parts.push({ type: 'toolGroup', steps: [], expanded: false });
					// Same stale-proxy concern as elsewhere: read back the
					// reactive version so `.steps.push(...)` below is tracked.
					currentToolGroup = assistantEntry.parts[assistantEntry.parts.length - 1];
				}
				currentToolGroup.steps.push({
					name: tc.name,
					args: tc.arguments,
					result,
					text: describeToolCall(tc.name, tc.arguments, result),
					ok: result.ok,
					expanded: false
				});
				consecutiveFailures = result.ok ? 0 : consecutiveFailures + 1;
			}

			if (askedQuestion) break;

			if (consecutiveFailures >= 3) {
				assistantEntry.parts.push({
					type: 'text',
					text: "\n\n_Stopping here — a few things in a row didn't work. Let me know how you'd like to proceed._"
				});
				break;
			}
		}
	}

	// Once a turn is over, its blow-by-blow tool-call history has already
	// done its job — every effect it had is captured in the fresh page
	// snapshot every future round gets anyway. Left in full, that history
	// is what makes token usage balloon on a long, many-round session (it's
	// resent, and grows, every single round from then on). So after each
	// turn, replace everything but its last message (or last
	// assistant+tool pair, if the turn ended on ask_question) with one
	// short synthetic note — cheap insurance against exactly that growth.
	function condenseTurnHistory(turnStartIndex) {
		const tail = wireMessages.slice(turnStartIndex);
		if (tail.length < 4) return; // not enough here to be worth summarizing

		const keepFromEnd = tail[tail.length - 1].role === 'tool' ? 2 : 1;
		const toCondense = tail.slice(0, tail.length - keepFromEnd);
		const kept = tail.slice(tail.length - keepFromEnd);

		const toolNames = [];
		for (const m of toCondense) {
			if (m.role === 'assistant' && m.tool_calls) {
				for (const tc of m.tool_calls) toolNames.push(tc.function.name);
			}
		}
		if (toolNames.length === 0) return; // nothing tool-call-shaped to save space on

		const counts = {};
		for (const n of toolNames) counts[n] = (counts[n] ?? 0) + 1;
		const summary = Object.entries(counts)
			.map(([n, c]) => (c > 1 ? `${n} x${c}` : n))
			.join(', ');

		wireMessages.splice(
			turnStartIndex,
			tail.length,
			{
				role: 'assistant',
				content: `[${toolNames.length} tool call(s) applied earlier this turn: ${summary}. The page snapshot below already reflects the result — this note replaces the detailed step-by-step history to save tokens.]`
			},
			...kept
		);
	}

	// `forcedText` lets an ask_question option button submit its label
	// directly, regardless of whatever's currently typed in the input box.
	async function send(forcedText) {
		const text = (forcedText ?? input).trim();
		if (!text || busy) return;
		if (forcedText === undefined) input = '';
		error = '';
		messages.push({ role: 'user', text });
		wireMessages.push({ role: 'user', content: text });
		const turnStartIndex = wireMessages.length;

		messages.push({ role: 'assistant', parts: [] });
		// Read the entry back out of `messages` rather than keeping the plain
		// object literal just pushed: Svelte's $state array wraps pushed
		// objects in a reactive proxy on read, and mutating the original
		// pre-proxy object afterwards (as every `.parts.push(...)` below
		// does) bypasses that proxy — the array's contents change, but no
		// dependent effect/template ever reruns, so the UI silently never
		// updates while the assistant is "typing".
		const assistantEntry = messages[messages.length - 1];

		busy = true;
		abortController = new AbortController();
		try {
			await runLoop(assistantEntry);
			condenseTurnHistory(turnStartIndex);
		} catch (err) {
			if (err?.name === 'AbortError') {
				assistantEntry.parts.push({ type: 'text', text: '\n\n_Stopped._' });
			} else {
				error = err?.message || String(err);
			}
		} finally {
			busy = false;
			abortController = null;
		}
	}

	function stop() {
		abortController?.abort();
	}

	function onKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="ap-panel">
	<div class="ap-messages" bind:this={messagesEl}>
		{#if messages.length === 0}
			<div class="ap-empty">
				<Icon name="assistant" size={28} />
				<p>Describe what you want to build — I'll use the same components and options you have available.</p>
			</div>
		{/if}
		{#each messages as msg}
			{#if msg.role === 'user'}
				<div class="ap-msg ap-msg--user">{msg.text}</div>
			{:else}
				<div class="ap-msg ap-msg--assistant">
					{#each msg.parts as part}
						{#if part.type === 'text'}
							<span class="ap-text">{part.text}</span>
						{:else if part.type === 'question'}
							<div class="ap-question">
								<div class="ap-question-text">{part.question}</div>
								{#if part.options?.length}
									<div class="ap-question-options">
										{#each part.options as opt}
											<button
												type="button"
												class="ap-option-btn"
												disabled={part.answered || busy}
												onclick={() => {
													part.answered = true;
													send(opt);
												}}
											>
												{opt}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{:else if part.type === 'plan'}
							<div class="ap-plan">
								{#each part.phases as phase, i}
									<div class="ap-plan-phase">
										<span class="ap-plan-num">{i + 1}</span>
										<div class="ap-plan-text">
											<div class="ap-plan-title">{phase.title}</div>
											{#if phase.detail}
												<div class="ap-plan-detail">{phase.detail}</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else if part.steps.length === 1}
							{@const step = part.steps[0]}
							<div class="ap-step" class:ap-step--error={!step.ok}>
								<button type="button" class="ap-step-row" onclick={() => (step.expanded = !step.expanded)}>
									<Icon name={step.ok ? 'check' : 'close'} size={12} />
									<span class="ap-step-text">{step.text}</span>
									<span class="ap-step-toggle">{step.expanded ? 'Hide' : 'Details'}</span>
								</button>
								{#if step.expanded}
									<pre class="ap-step-json">{JSON.stringify({ tool: step.name, args: step.args, result: step.result }, null, 2)}</pre>
								{/if}
							</div>
						{:else}
							<div class="ap-step" class:ap-step--error={part.steps.every((s) => !s.ok)}>
								<button type="button" class="ap-step-row" onclick={() => (part.expanded = !part.expanded)}>
									<Icon name={part.steps.every((s) => s.ok) ? 'check' : 'close'} size={12} />
									<span class="ap-step-text">{groupSummary(part.steps)}</span>
									<span class="ap-step-toggle">{part.expanded ? 'Hide' : 'Details'}</span>
								</button>
								{#if part.expanded}
									<div class="ap-substeps">
										{#each part.steps as step}
											<div class="ap-step ap-substep" class:ap-step--error={!step.ok}>
												<button type="button" class="ap-step-row" onclick={() => (step.expanded = !step.expanded)}>
													<Icon name={step.ok ? 'check' : 'close'} size={11} />
													<span class="ap-step-text">{step.text}</span>
													<span class="ap-step-toggle">{step.expanded ? 'Hide' : 'JSON'}</span>
												</button>
												{#if step.expanded}
													<pre class="ap-step-json">{JSON.stringify({ tool: step.name, args: step.args, result: step.result }, null, 2)}</pre>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					{/each}
					{#if busy && msg === messages[messages.length - 1]}
						<span class="ap-cursor"></span>
					{/if}
				</div>
			{/if}
		{/each}
		{#if error}
			<div class="ap-error">
				{error}
				<button type="button" class="ap-retry" onclick={() => send()}>Retry</button>
			</div>
		{/if}
	</div>

	<div class="ap-input-row">
		<textarea
			class="ap-input"
			placeholder="Describe what to build…"
			bind:value={input}
			onkeydown={onKeydown}
			disabled={busy}
			rows="2"
		></textarea>
		{#if busy}
			<button type="button" class="ap-stop" onclick={stop} data-tooltip="Stops the conversation — anything already built stays">
				<Icon name="close" size={14} />
			</button>
		{:else}
			<button type="button" class="ap-send" disabled={!input.trim()} onclick={() => send()}>
				<Icon name="chevron" size={16} />
			</button>
		{/if}
	</div>
	{#if sessionUsage.total > 0}
		<div class="ap-usage" data-tooltip="Cumulative across this tab — resets on page reload">
			<Icon name="bolt" size={11} />
			<span>{sessionUsage.total.toLocaleString()} tokens this session</span>
			<span class="ap-usage-detail">({sessionUsage.prompt.toLocaleString()} in / {sessionUsage.completion.toLocaleString()} out)</span>
		</div>
	{/if}
</div>

<style>
	.ap-panel {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
	}
	.ap-messages {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.ap-empty {
		margin: auto;
		text-align: center;
		color: #8a8f98;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 24px;
	}
	.ap-empty p {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.5;
	}
	.ap-msg {
		font-size: 13px;
		line-height: 1.5;
		border-radius: 10px;
		padding: 8px 11px;
		max-width: 92%;
	}
	.ap-msg--user {
		align-self: flex-end;
		background: #0b57d0;
		color: #fff;
		white-space: pre-wrap;
	}
	.ap-msg--assistant {
		align-self: stretch;
		background: #f5f5f6;
		color: #1a1c1e;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.ap-text {
		white-space: pre-wrap;
	}
	.ap-question {
		background: #fff;
		border: 1px solid #cddcf9;
		border-left: 3px solid #0b57d0;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ap-question-text {
		font-size: 13px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.ap-question-options {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.ap-option-btn {
		border: 1px solid #0b57d0;
		background: #f2f6fe;
		color: #0b57d0;
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: 999px;
		cursor: pointer;
	}
	.ap-option-btn:hover:not(:disabled) {
		background: #0b57d0;
		color: #fff;
	}
	.ap-option-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.ap-plan {
		background: #fff;
		border: 1px solid #e2e4e8;
		border-radius: 8px;
		padding: 4px 12px;
		display: flex;
		flex-direction: column;
	}
	.ap-plan-phase {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 9px 0;
	}
	.ap-plan-phase + .ap-plan-phase {
		border-top: 1px solid #eef0f2;
	}
	.ap-plan-num {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #f2f6fe;
		color: #0b57d0;
		font-size: 10.5px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 1px;
	}
	.ap-plan-text {
		min-width: 0;
	}
	.ap-plan-title {
		font-size: 12.5px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.ap-plan-detail {
		margin-top: 2px;
		font-size: 11.5px;
		color: #8a8f98;
		line-height: 1.4;
	}
	.ap-substeps {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 0 8px 8px;
		border-top: 1px solid #e2e4e8;
		padding-top: 6px;
	}
	.ap-substep {
		font-size: 11.5px;
	}
	.ap-step {
		font-size: 12px;
		color: #4a4f58;
		background: #fff;
		border: 1px solid #e2e4e8;
		border-radius: 6px;
	}
	.ap-step-row {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		border: none;
		background: none;
		font-family: inherit;
		font-size: inherit;
		color: inherit;
		padding: 5px 8px;
		cursor: pointer;
		text-align: left;
	}
	.ap-step-text {
		flex: 1;
		min-width: 0;
	}
	.ap-step-toggle {
		flex-shrink: 0;
		font-size: 10.5px;
		font-weight: 600;
		color: #8a8f98;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.ap-step-row:hover .ap-step-toggle {
		color: #0b57d0;
	}
	.ap-step-json {
		margin: 0;
		padding: 8px;
		border-top: 1px solid #e2e4e8;
		background: #f8f9fa;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 10.5px;
		line-height: 1.5;
		color: #2b2e33;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 240px;
		overflow-y: auto;
		border-radius: 0 0 6px 6px;
	}
	.ap-step :global(svg) {
		flex-shrink: 0;
		color: #1a7d3d;
	}
	.ap-step--error {
		color: #9a3b30;
		border-color: #f5d9d3;
		background: #fdf1ef;
	}
	.ap-step--error :global(svg) {
		color: #b3261e;
	}
	.ap-step--error .ap-step-json {
		border-top-color: #f5d9d3;
		background: #fff7f5;
	}
	.ap-cursor {
		display: inline-block;
		width: 6px;
		height: 13px;
		background: #8a8f98;
		vertical-align: text-bottom;
		animation: ap-blink 1s step-start infinite;
	}
	@keyframes ap-blink {
		50% {
			opacity: 0;
		}
	}
	.ap-error {
		align-self: stretch;
		font-size: 12px;
		color: #b3261e;
		background: #fdf1ef;
		border: 1px solid #f5d9d3;
		border-radius: 8px;
		padding: 8px 10px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.ap-retry {
		flex-shrink: 0;
		border: 1px solid #b3261e;
		background: #fff;
		color: #b3261e;
		font-family: inherit;
		font-size: 11px;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 5px;
		cursor: pointer;
	}
	.ap-input-row {
		flex-shrink: 0;
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 10px 12px;
		border-top: 1px solid #e2e4e8;
		background: #fff;
	}
	.ap-usage {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 6px 12px 10px;
		background: #fff;
		font-size: 11px;
		color: #b0b4bb;
	}
	.ap-usage :global(svg) {
		flex-shrink: 0;
		color: #c9cdd4;
	}
	.ap-usage-detail {
		color: #c9cdd4;
	}
	.ap-input {
		flex: 1;
		min-width: 0;
		resize: none;
		font-family: inherit;
		font-size: 13px;
		color: #1a1c1e;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		padding: 8px 10px;
		outline: none;
	}
	.ap-input:focus {
		border-color: #0b57d0;
	}
	.ap-send,
	.ap-stop {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.ap-send {
		background: #0b57d0;
		color: #fff;
		transform: rotate(90deg);
	}
	.ap-send:disabled {
		background: #c9cdd4;
		cursor: not-allowed;
	}
	.ap-stop {
		background: #b3261e;
		color: #fff;
	}
</style>
