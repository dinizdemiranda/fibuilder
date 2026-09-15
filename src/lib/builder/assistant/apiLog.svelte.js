// App-wide log of every response the OpenAI API sent back through
// /api/assistant — separate from AssistantPanel's own rendered chat
// transcript so it survives independent of which sidebar tab is open and
// can be reviewed from the top menu (see SystemPromptModal's sibling,
// ApiLogModal). Session-only, like the rest of the assistant's state: it
// resets on a real page reload, never persisted.

const MAX_ENTRIES = 300; // defensive cap for a very long session — oldest entries drop off

export const apiLog = $state({ entries: [] });

let counter = 0;

export function logApiResponse(entry) {
	apiLog.entries.unshift({ id: `apilog_${++counter}`, timestamp: Date.now(), expanded: false, ...entry });
	if (apiLog.entries.length > MAX_ENTRIES) apiLog.entries.length = MAX_ENTRIES;
}
