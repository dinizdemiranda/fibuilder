<script>
	import { doc, workflowView } from './state.svelte.js';
	import { getLabelById, getLabelThumbnail } from './labels.js';
	import WorkflowNodeShell from './WorkflowNodeShell.svelte';
	import PageNode from './PageNode.svelte';
	import LabelNode from './LabelNode.svelte';
	import TransformNode from './TransformNode.svelte';
	import TransformMenu from './TransformMenu.svelte';
	import Icon from './Icon.svelte';
	import {
		nodePositionFor,
		setNodePosition,
		fieldEndpoint,
		transformInEndpoint,
		transformOutEndpoint,
		endpointPos,
		connectEndpoints,
		disconnectEdge,
		insertTransformIntoEdge,
		resolveValueType,
		createTransform,
		removeTransform,
		getTransform,
		setTransformPosition,
		sourceById,
		transformColor,
		NODE_WIDTH
	} from './workflow.js';

	let viewportEl = $state(null);
	let spaceHeld = $state(false);
	let panDrag = $state(null); // { startScreenX, startScreenY, startPanX, startPanY }
	let nodeDrag = $state(null); // { kind: 'page'|'label'|'transform', key, startScreenX, startScreenY, startX, startY }
	let connDrag = $state(null); // { from: endpoint, x1, y1, x2, y2 }
	let hoveredConnId = $state(null);
	let deleteHoverId = $state(null);
	let hoverClearTimer = null;
	let transformMenu = $state(null); // { screenX, screenY, canvasX, canvasY, valueType, context }

	function toCanvas(clientX, clientY) {
		const rect = viewportEl.getBoundingClientRect();
		return {
			x: (clientX - rect.left - workflowView.panX) / workflowView.zoom,
			y: (clientY - rect.top - workflowView.panY) / workflowView.zoom
		};
	}

	function onWheel(e) {
		e.preventDefault();
		const rect = viewportEl.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const canvasX = (mx - workflowView.panX) / workflowView.zoom;
		const canvasY = (my - workflowView.panY) / workflowView.zoom;
		const factor = Math.exp(-e.deltaY * 0.001);
		const newZoom = Math.min(2, Math.max(0.25, workflowView.zoom * factor));
		workflowView.panX = mx - canvasX * newZoom;
		workflowView.panY = my - canvasY * newZoom;
		workflowView.zoom = newZoom;
	}

	function onViewportMouseDown(e) {
		if (spaceHeld && e.button === 0) {
			e.preventDefault();
			panDrag = { startScreenX: e.clientX, startScreenY: e.clientY, startPanX: workflowView.panX, startPanY: workflowView.panY };
		}
	}

	function startNodeDrag(kind, key, e) {
		if (e.button !== 0) return;
		e.preventDefault();
		const pos = kind === 'transform' ? getTransform(key) : nodePositionFor(key);
		if (!pos) return;
		nodeDrag = { kind, key, startScreenX: e.clientX, startScreenY: e.clientY, startX: pos.x, startY: pos.y };
	}

	function startConnDrag(fromEndpoint, e) {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		const origin = endpointPos(fromEndpoint);
		if (!origin) return;
		const cur = toCanvas(e.clientX, e.clientY);
		connDrag = { from: fromEndpoint, x1: origin.x, y1: origin.y, x2: cur.x, y2: cur.y };
	}

	function onWindowMouseMove(e) {
		if (panDrag) {
			workflowView.panX = panDrag.startPanX + (e.clientX - panDrag.startScreenX);
			workflowView.panY = panDrag.startPanY + (e.clientY - panDrag.startScreenY);
		} else if (nodeDrag) {
			const dx = (e.clientX - nodeDrag.startScreenX) / workflowView.zoom;
			const dy = (e.clientY - nodeDrag.startScreenY) / workflowView.zoom;
			const nx = nodeDrag.startX + dx;
			const ny = nodeDrag.startY + dy;
			if (nodeDrag.kind === 'transform') setTransformPosition(nodeDrag.key, nx, ny);
			else setNodePosition(nodeDrag.key, nx, ny);
		} else if (connDrag) {
			const cur = toCanvas(e.clientX, e.clientY);
			connDrag = { ...connDrag, x2: cur.x, y2: cur.y };
		}
	}

	function withinViewport(clientX, clientY) {
		const rect = viewportEl.getBoundingClientRect();
		return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
	}

	function onWindowMouseUp(e) {
		if (connDrag) {
			const el = document.elementFromPoint(e.clientX, e.clientY);
			const target = el?.closest('[data-wf-input]');
			if (target) {
				const kind = target.dataset.wfInputKind;
				const to =
					kind === 'field'
						? fieldEndpoint(target.dataset.labelId, target.dataset.field)
						: transformInEndpoint(target.dataset.transformId);
				connectEndpoints(connDrag.from, to);
			} else {
				const overNode = el?.closest('.wf-node, .wf-tnode');
				if (!overNode && withinViewport(e.clientX, e.clientY)) {
					openMenuForNewEdge(connDrag.from, e);
				}
			}
			connDrag = null;
		}
		panDrag = null;
		nodeDrag = null;
	}

	function onKeydown(e) {
		if (e.code === 'Space' && !spaceHeld && !isTypingTarget(e.target)) {
			spaceHeld = true;
			e.preventDefault();
		}
	}
	function onKeyup(e) {
		if (e.code === 'Space') spaceHeld = false;
	}
	function isTypingTarget(target) {
		const tag = target?.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
	}

	function zoomBy(factor) {
		const rect = viewportEl.getBoundingClientRect();
		const mx = rect.width / 2;
		const my = rect.height / 2;
		const canvasX = (mx - workflowView.panX) / workflowView.zoom;
		const canvasY = (my - workflowView.panY) / workflowView.zoom;
		const newZoom = Math.min(2, Math.max(0.25, workflowView.zoom * factor));
		workflowView.panX = mx - canvasX * newZoom;
		workflowView.panY = my - canvasY * newZoom;
		workflowView.zoom = newZoom;
	}

	function resetView() {
		workflowView.zoom = 1;
		workflowView.panX = 80;
		workflowView.panY = 60;
	}

	function pathBetween(x1, y1, x2, y2) {
		const dx = Math.max(50, Math.abs(x2 - x1) * 0.5);
		return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
	}

	// Connection-hover buttons need a forgiving "hover island" — moving the
	// pointer from the invisible hit-path onto the Add/Delete buttons must not
	// flicker them away, so clearing is debounced and re-entering cancels it.
	function setHovered(id) {
		if (hoverClearTimer) {
			clearTimeout(hoverClearTimer);
			hoverClearTimer = null;
		}
		hoveredConnId = id;
	}
	function clearHoveredSoon() {
		hoverClearTimer = setTimeout(() => {
			hoveredConnId = null;
		}, 150);
	}

	function openMenuForNewEdge(from, e) {
		const cur = toCanvas(e.clientX, e.clientY);
		const rect = viewportEl.getBoundingClientRect();
		transformMenu = {
			screenX: e.clientX - rect.left,
			screenY: e.clientY - rect.top,
			canvasX: cur.x,
			canvasY: cur.y,
			valueType: resolveValueType(from),
			context: { type: 'new-edge', from }
		};
	}

	function openMenuForEdge(link, e) {
		e.stopPropagation();
		const rect = viewportEl.getBoundingClientRect();
		transformMenu = {
			screenX: e.clientX - rect.left,
			screenY: e.clientY - rect.top,
			canvasX: link.mid.x - NODE_WIDTH / 2,
			canvasY: link.mid.y - 20,
			valueType: resolveValueType(link.edge.from),
			context: { type: 'insert-edge', edgeId: link.id }
		};
	}

	function onTransformMenuSelect(type) {
		if (!transformMenu) return;
		const t = createTransform(type, transformMenu.canvasX, transformMenu.canvasY, transformMenu.valueType);
		if (transformMenu.context.type === 'new-edge') {
			connectEndpoints(transformMenu.context.from, transformInEndpoint(t.id));
		} else {
			insertTransformIntoEdge(transformMenu.context.edgeId, t);
		}
		transformMenu = null;
	}

	function edgeColor(edge) {
		if (edge.from.kind === 'transformOut') {
			const t = getTransform(edge.from.id);
			return transformColor(t?.type);
		}
		return sourceById(edge.from.id)?.type === 'variable' ? '#7c3aed' : '#0b57d0';
	}

	let connectionPaths = $derived.by(() => {
		return doc.workflow.connections
			.map((edge) => {
				const p1 = endpointPos(edge.from);
				const p2 = endpointPos(edge.to);
				if (!p1 || !p2) return null;
				return {
					id: edge.id,
					edge,
					d: pathBetween(p1.x, p1.y, p2.x, p2.y),
					mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
					color: edgeColor(edge)
				};
			})
			.filter(Boolean);
	});

	let pagePos = $derived(nodePositionFor('page'));
</script>

<svelte:window onmousemove={onWindowMouseMove} onmouseup={onWindowMouseUp} onkeydown={onKeydown} onkeyup={onKeyup} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wf-viewport"
	class:space-held={spaceHeld}
	class:panning={!!panDrag}
	bind:this={viewportEl}
	style="background-position: {workflowView.panX}px {workflowView.panY}px; background-size: {22 * workflowView.zoom}px {22 * workflowView.zoom}px;"
	onwheel={onWheel}
	onmousedown={onViewportMouseDown}
>
	<div
		class="wf-canvas"
		style="transform: translate({workflowView.panX}px, {workflowView.panY}px) scale({workflowView.zoom});"
	>
		<svg class="wf-links">
			{#each connectionPaths as link (link.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<path
					class="wf-link-hit"
					d={link.d}
					onmouseenter={() => setHovered(link.id)}
					onmouseleave={clearHoveredSoon}
				/>
				<path
					class="wf-link"
					class:hot={deleteHoverId === link.id}
					style="stroke: {deleteHoverId === link.id ? '#b3261e' : link.color};"
					d={link.d}
				/>
			{/each}
			{#if connDrag}
				<path
					class="wf-link wf-link-temp"
					style="stroke: {edgeColor({ from: connDrag.from })};"
					d={pathBetween(connDrag.x1, connDrag.y1, connDrag.x2, connDrag.y2)}
				/>
			{/if}
		</svg>

		<WorkflowNodeShell x={pagePos.x} y={pagePos.y} title={doc.page.title} icon="layers" variant="page" onHeaderMouseDown={(e) => startNodeDrag('page', 'page', e)}>
			<PageNode onSocketMouseDown={startConnDrag} />
		</WorkflowNodeShell>

		{#each doc.labels as labelId (labelId)}
			{@const pos = nodePositionFor(labelId)}
			{@const label = getLabelById(labelId)}
			<WorkflowNodeShell
				x={pos.x}
				y={pos.y}
				title={label?.name ?? labelId}
				icon="label"
				thumbnail={getLabelThumbnail(labelId)}
				onHeaderMouseDown={(e) => startNodeDrag('label', labelId, e)}
			>
				<LabelNode {labelId} />
			</WorkflowNodeShell>
		{/each}

		{#each doc.workflow.transforms as t (t.id)}
			<TransformNode
				transform={t}
				onHeaderMouseDown={(e) => startNodeDrag('transform', t.id, e)}
				onOutputMouseDown={(e) => startConnDrag(transformOutEndpoint(t.id), e)}
				onRemove={removeTransform}
			/>
		{/each}

		{#each connectionPaths as link (link.id)}
			{#if hoveredConnId === link.id}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="wf-link-actions"
					style="left: {link.mid.x}px; top: {link.mid.y}px;"
					onmouseenter={() => setHovered(link.id)}
					onmouseleave={clearHoveredSoon}
				>
					<button type="button" class="wf-link-btn" data-tooltip="Add" onclick={(e) => openMenuForEdge(link, e)}>
						<Icon name="plus" size={12} />
					</button>
					<button
						type="button"
						class="wf-link-btn wf-link-btn-delete"
						data-tooltip="Delete"
						onmouseenter={() => (deleteHoverId = link.id)}
						onmouseleave={() => (deleteHoverId = null)}
						onclick={() => disconnectEdge(link.id)}
					>
						<Icon name="trash" size={12} />
					</button>
				</div>
			{/if}
		{/each}
	</div>

	{#if transformMenu}
		<TransformMenu
			x={transformMenu.screenX}
			y={transformMenu.screenY}
			valueType={transformMenu.valueType}
			onselect={onTransformMenuSelect}
			onclose={() => (transformMenu = null)}
		/>
	{/if}

	<div class="wf-toolbar">
		<button type="button" onclick={() => zoomBy(0.83)} data-tooltip="Zoom out">−</button>
		<span class="wf-zoom-label">{Math.round(workflowView.zoom * 100)}%</span>
		<button type="button" onclick={() => zoomBy(1.2)} data-tooltip="Zoom in">+</button>
		<button type="button" class="wf-reset" onclick={resetView} data-tooltip="Reset view">Reset</button>
	</div>
	<div class="wf-hint">Hold <kbd>Space</kbd> + drag to pan · Scroll to zoom · Drag a dot to connect</div>
</div>

<style>
	.wf-viewport {
		flex: 1;
		position: relative;
		overflow: hidden;
		background: #f2f3f5;
		background-image: radial-gradient(circle, #d8dade 1px, transparent 1px);
		background-size: 22px 22px;
		cursor: default;
	}
	.wf-viewport.space-held {
		cursor: grab;
	}
	.wf-viewport.panning {
		cursor: grabbing;
	}
	.wf-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		transform-origin: 0 0;
	}
	.wf-links {
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 1px;
		overflow: visible;
		pointer-events: none;
	}
	.wf-link {
		fill: none;
		stroke-width: 2;
	}
	.wf-link.hot {
		stroke-width: 2.5;
	}
	.wf-link-temp {
		stroke-dasharray: 5 4;
		opacity: 0.7;
	}
	.wf-link-hit {
		fill: none;
		stroke: transparent;
		stroke-width: 14;
		pointer-events: stroke;
		cursor: pointer;
	}
	.wf-link-actions {
		position: absolute;
		transform: translate(-50%, -50%);
		display: flex;
		gap: 3px;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 7px;
		padding: 3px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
	.wf-link-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 4px;
		background: #f5f5f6;
		color: #1a1c1e;
		cursor: pointer;
		padding: 0;
	}
	.wf-link-btn:hover {
		background: #e8f0fe;
		color: #0b57d0;
	}
	.wf-link-btn-delete:hover {
		background: #fde3e3;
		color: #b3261e;
	}
	.wf-toolbar {
		position: absolute;
		left: 16px;
		bottom: 16px;
		display: flex;
		align-items: center;
		gap: 4px;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		padding: 4px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
		font-family: system-ui, sans-serif;
	}
	.wf-toolbar button {
		width: 26px;
		height: 26px;
		border: none;
		background: none;
		border-radius: 5px;
		font-size: 15px;
		color: #1a1c1e;
		cursor: pointer;
	}
	.wf-toolbar button:hover {
		background: #f0f1f3;
	}
	.wf-reset {
		width: auto !important;
		padding: 0 8px;
		font-size: 11px !important;
	}
	.wf-zoom-label {
		font-size: 11px;
		color: #5a5f68;
		width: 34px;
		text-align: center;
	}
	.wf-hint {
		position: absolute;
		right: 16px;
		bottom: 16px;
		font-family: system-ui, sans-serif;
		font-size: 11px;
		color: #8a8f98;
		background: #fff;
		border: 1px solid #e2e4e8;
		border-radius: 6px;
		padding: 5px 10px;
	}
	.wf-hint kbd {
		background: #eceef1;
		border-radius: 3px;
		padding: 1px 4px;
		font-family: inherit;
	}
</style>
