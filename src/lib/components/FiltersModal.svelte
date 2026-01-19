<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '../i18n';

	export interface FilterState {
		needsReview: boolean;
		priorities: number[]; // 1 = Low, 2 = Medium, 3 = Blocker
		principles: string[]; // '1' = Perceivable, '2' = Operable, '3' = Understandable, '4' = Robust
		pages: string[];
	}

	let {
		availablePages,
		filters = $bindable<FilterState>({
			needsReview: false,
			priorities: [],
			principles: [],
			pages: []
		}),
		onClose
	}: {
		availablePages: string[];
		filters: FilterState;
		onClose: () => void;
	} = $props();

	let needsReviewCheckbox: HTMLInputElement;

	// Local state for editing
	let localFilters = $state<FilterState>({
		needsReview: filters.needsReview,
		priorities: [...filters.priorities],
		principles: [...filters.principles],
		pages: [...filters.pages]
	});

	onMount(() => {
		needsReviewCheckbox?.focus();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function togglePriority(priority: number) {
		if (localFilters.priorities.includes(priority)) {
			localFilters.priorities = localFilters.priorities.filter((p) => p !== priority);
		} else {
			localFilters.priorities = [...localFilters.priorities, priority];
		}
	}

	function togglePrinciple(principle: string) {
		if (localFilters.principles.includes(principle)) {
			localFilters.principles = localFilters.principles.filter((p) => p !== principle);
		} else {
			localFilters.principles = [...localFilters.principles, principle];
		}
	}

	function togglePage(page: string) {
		if (localFilters.pages.includes(page)) {
			localFilters.pages = localFilters.pages.filter((p) => p !== page);
		} else {
			localFilters.pages = [...localFilters.pages, page];
		}
	}

	function applyFilters() {
		filters = { ...localFilters };
		onClose();
	}

	function clearAllAndApply() {
		filters = {
			needsReview: false,
			priorities: [],
			principles: [],
			pages: []
		};
		onClose();
	}

	const priorities = [
		{ value: 3, label: () => $t('priorityBlocker') },
		{ value: 2, label: () => $t('priorityMedium') },
		{ value: 1, label: () => $t('priorityLow') }
	];

	const principles = [
		{ value: '1', label: () => $t('principlePerceivable') },
		{ value: '2', label: () => $t('principleOperable') },
		{ value: '3', label: () => $t('principleUnderstandable') },
		{ value: '4', label: () => $t('principleRobust') }
	];
</script>

<div
	class="modal-overlay"
	onclick={handleOverlayClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-labelledby="filters-dialog-title"
	aria-modal="true"
	tabindex="-1"
>
	<div class="modal">
		<h2 id="filters-dialog-title">{$t('filters')}</h2>

		<div class="filter-section">
			<label class="checkbox-item">
				<input
					type="checkbox"
					bind:this={needsReviewCheckbox}
					bind:checked={localFilters.needsReview}
				/>
				{$t('showOnlyNeedsReview')}
			</label>
		</div>

		<fieldset class="filter-section">
			<legend>{$t('filterByPriority')}</legend>
			<ul class="checkbox-list">
				{#each priorities as priority}
					<li>
						<label class="checkbox-item">
							<input
								type="checkbox"
								checked={localFilters.priorities.includes(priority.value)}
								onchange={() => togglePriority(priority.value)}
							/>
							{priority.label()}
						</label>
					</li>
				{/each}
			</ul>
		</fieldset>

		<fieldset class="filter-section">
			<legend>{$t('filterByPrinciple')}</legend>
			<ul class="checkbox-list">
				{#each principles as principle}
					<li>
						<label class="checkbox-item">
							<input
								type="checkbox"
								checked={localFilters.principles.includes(principle.value)}
								onchange={() => togglePrinciple(principle.value)}
							/>
							{principle.label()}
						</label>
					</li>
				{/each}
			</ul>
		</fieldset>

		{#if availablePages.length > 0}
			<fieldset class="filter-section">
				<legend>{$t('filterByPage')}</legend>
				<ul class="checkbox-list checkbox-list-scrollable">
					{#each availablePages as page}
						<li>
							<label class="checkbox-item">
								<input
									type="checkbox"
									checked={localFilters.pages.includes(page)}
									onchange={() => togglePage(page)}
								/>
								{page}
							</label>
						</li>
					{/each}
				</ul>
			</fieldset>
		{/if}

		<div class="modal-actions">
			<button type="button" onclick={applyFilters} class="btn-primary">
				{$t('applyFilters')}
			</button>
			<button type="button" onclick={clearAllAndApply} class="btn-danger">
				{$t('removeAllFilters')}
			</button>
			<button type="button" onclick={onClose} class="btn-secondary">
				{$t('cancel')}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1000;
		overflow-y: auto;
	}

	.modal {
		background: #ffffff;
		padding: 2rem;
		border-radius: 12px;
		max-width: 500px;
		width: 100%;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
		margin: auto;
	}

	.modal h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		color: #1a1a1a;
	}

	.filter-section {
		margin-bottom: 1.5rem;
		border: none;
		padding: 0;
	}

	fieldset.filter-section {
		border: 1px solid #dee2e6;
		border-radius: 8px;
		padding: 1rem;
	}

	legend {
		font-weight: 600;
		color: #212529;
		padding: 0 0.5rem;
		font-size: 1rem;
	}

	.checkbox-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.checkbox-list-scrollable {
		max-height: 150px;
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.checkbox-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: 500;
		padding: 0.25rem 0;
	}

	.checkbox-item input[type='checkbox'] {
		width: 1.125rem;
		height: 1.125rem;
		cursor: pointer;
		accent-color: #0066cc;
		flex-shrink: 0;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e9ecef;
		flex-wrap: wrap;
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background-color: #0066cc;
		color: #ffffff;
	}

	.btn-primary:hover {
		background-color: #0052a3;
	}

	.btn-primary:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
	}

	.btn-secondary {
		background-color: #6c757d;
		color: #ffffff;
	}

	.btn-secondary:hover {
		background-color: #5a6268;
	}

	.btn-secondary:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(108, 117, 125, 0.5);
	}

	.btn-danger {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		background-color: #dc3545;
		color: #ffffff;
	}

	.btn-danger:hover {
		background-color: #c82333;
	}

	.btn-danger:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.5);
	}

	@media (prefers-color-scheme: dark) {
		.modal {
			background: #2d2d2d;
			color: #e9ecef;
		}

		.modal h2 {
			color: #e9ecef;
		}

		legend {
			color: #e9ecef;
		}

		fieldset.filter-section {
			border-color: #495057;
		}

		.modal-actions {
			border-top-color: #495057;
		}
	}
</style>
