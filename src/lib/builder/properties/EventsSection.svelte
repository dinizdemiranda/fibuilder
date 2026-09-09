<script>
	import PropSection from './PropSection.svelte';
	import Icon from '../Icon.svelte';
	import EventPopover from './EventPopover.svelte';
	import { describeEvent } from '../events.js';

	// `popover`/`describe` default to the button's click-event popover; Data
	// Lookup passes its own (different trigger, different fields) so this
	// list UI can be shared by both.
	let { element, popover: Popover = EventPopover, describe = describeEvent, popoverProps = {} } = $props();

	let openIndex = $state(null); // number = editing that event, 'new' = adding, null = closed

	function removeEvent(i) {
		element.events.splice(i, 1);
	}
</script>

<PropSection title="Events" defaultOpen={true}>
	{#if !element.events || element.events.length === 0}
		<p class="prop-hint">No events yet.</p>
	{:else}
		<ul class="events-list">
			{#each element.events as event, i (event.id)}
				<li class="events-row">
					<button type="button" class="events-desc" onclick={() => (openIndex = i)}>
						{describe(event)}
					</button>
					<button type="button" class="icon-btn" data-tooltip="Remove event" onclick={() => removeEvent(i)}>
						<Icon name="trash" size={13} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<button type="button" class="add-btn" onclick={() => (openIndex = 'new')}>+ Add event</button>
</PropSection>

{#if openIndex !== null}
	<Popover
		{element}
		{...popoverProps}
		event={openIndex === 'new' ? null : element.events[openIndex]}
		onclose={() => (openIndex = null)}
	/>
{/if}

<style>
	.events-list {
		list-style: none;
		margin: 0 0 10px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		border: 1px solid #e2e4e8;
		border-radius: 6px;
		overflow: hidden;
	}
	.events-row {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #fff;
	}
	.events-row:nth-child(even) {
		background: #fafafb;
	}
	.events-desc {
		flex: 1;
		min-width: 0;
		text-align: left;
		border: none;
		background: none;
		padding: 8px 10px;
		font-family: system-ui, sans-serif;
		font-size: 12px;
		color: #1a1c1e;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.events-desc:hover {
		color: #0b57d0;
	}
	.events-row .icon-btn {
		flex-shrink: 0;
		margin-right: 6px;
		border: none;
	}
</style>
