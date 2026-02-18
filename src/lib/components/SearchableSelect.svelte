<script lang="ts">
	import { t } from '../i18n';

	interface Option {
		value: string;
		label: string;
		searchText: string; // Additional text for searching (e.g., number without dots)
	}

	let {
		options,
		value = $bindable(''),
		placeholder = '',
		id,
		required = false,
		hasError = false,
		errorId
	}: {
		options: Option[];
		value: string;
		placeholder?: string;
		id: string;
		required?: boolean;
		hasError?: boolean;
		errorId?: string;
	} = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);
	let highlightedIndex = $state(-1);
	let inputElement: HTMLInputElement;
	let listboxElement: HTMLUListElement;

	const listboxId = `${id}-listbox`;

	// Get the display text for the current value
	const selectedLabel = $derived.by(() => {
		const selected = options.find((opt) => opt.value === value);
		return selected ? selected.label : '';
	});

	// Filter options based on search query
	const filteredOptions = $derived.by(() => {
		if (!searchQuery) return options;

		const query = searchQuery.toLowerCase().replace(/\./g, '');

		return options.filter((opt) => {
			// Search in label
			if (opt.label.toLowerCase().includes(searchQuery.toLowerCase())) return true;
			// Search in number without dots (e.g., "111" matches "1.1.1")
			if (opt.searchText.includes(query)) return true;
			// Search in value (the number with dots)
			if (opt.value.toLowerCase().includes(searchQuery.toLowerCase())) return true;
			return false;
		});
	});

	// Initialize display value when component mounts or value changes externally
	$effect(() => {
		if (value && !isOpen) {
			const selected = options.find((opt) => opt.value === value);
			if (selected) {
				searchQuery = selected.label;
			}
		}
	});

	function openDropdown() {
		isOpen = true;
		highlightedIndex = -1;
		// Clear search to show all options when opening
		if (value) {
			searchQuery = '';
		}
	}

	function closeDropdown() {
		isOpen = false;
		highlightedIndex = -1;
		// Restore the selected value's label
		if (value) {
			const selected = options.find((opt) => opt.value === value);
			if (selected) {
				searchQuery = selected.label;
			}
		} else {
			searchQuery = '';
		}
	}

	function selectOption(option: Option) {
		value = option.value;
		searchQuery = option.label;
		closeDropdown();
		inputElement?.focus();
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		if (!isOpen) {
			openDropdown();
		}
		highlightedIndex = filteredOptions.length > 0 ? 0 : -1;
	}

	function handleKeydown(e: KeyboardEvent) {
		const filtered = filteredOptions;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (!isOpen) {
					openDropdown();
				} else if (filtered.length > 0) {
					highlightedIndex = Math.min(highlightedIndex + 1, filtered.length - 1);
					scrollToHighlighted();
				}
				break;

			case 'ArrowUp':
				e.preventDefault();
				if (isOpen && filtered.length > 0) {
					highlightedIndex = Math.max(highlightedIndex - 1, 0);
					scrollToHighlighted();
				}
				break;

			case 'Enter':
				e.preventDefault();
				if (isOpen && highlightedIndex >= 0 && filtered[highlightedIndex]) {
					selectOption(filtered[highlightedIndex]);
				}
				break;

			case 'Escape':
				e.preventDefault();
				closeDropdown();
				break;

			case 'Tab':
				if (isOpen) {
					closeDropdown();
				}
				break;
		}
	}

	function handleFocus() {
		openDropdown();
	}

	function handleBlur(e: FocusEvent) {
		// Delay close to allow click on option
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (relatedTarget?.closest('.searchable-select-dropdown')) {
			return;
		}
		setTimeout(() => {
			closeDropdown();
		}, 150);
	}

	function scrollToHighlighted() {
		if (highlightedIndex >= 0 && listboxElement) {
			const item = listboxElement.children[highlightedIndex] as HTMLElement;
			if (item) {
				item.scrollIntoView({ block: 'nearest' });
			}
		}
	}

	function getOptionId(index: number): string {
		return `${id}-option-${index}`;
	}
</script>

<div class="searchable-select">
	<input
		bind:this={inputElement}
		type="text"
		{id}
		role="combobox"
		aria-autocomplete="list"
		aria-expanded={isOpen}
		aria-controls={listboxId}
		aria-activedescendant={highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined}
		aria-required={required}
		aria-invalid={hasError}
		aria-describedby={errorId}
		value={searchQuery}
		{placeholder}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={handleFocus}
		onblur={handleBlur}
		autocomplete="off"
	/>

	{#if isOpen}
		<ul
			bind:this={listboxElement}
			id={listboxId}
			class="searchable-select-dropdown"
			role="listbox"
			aria-label={placeholder}
		>
			{#if filteredOptions.length === 0}
				<li class="no-results" role="status">{$t('noResultsFound')}</li>
			{:else}
				{#each filteredOptions as option, index (option.value)}
					<li
						id={getOptionId(index)}
						role="option"
						aria-selected={option.value === value}
						class:highlighted={index === highlightedIndex}
						class:selected={option.value === value}
						onmousedown={() => selectOption(option)}
						onmouseenter={() => (highlightedIndex = index)}
					>
						{option.label}
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>

<style>
	.searchable-select {
		position: relative;
		width: 100%;
	}

	input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		line-height: 1.5;
		color: #212529;
		background-color: #fff;
		border: 2px solid #ced4da;
		border-radius: 6px;
		font-family: inherit;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	input:hover:not(:focus) {
		border-color: #adb5bd;
	}

	input[aria-invalid='true'] {
		border-color: #dc3545;
	}

	input[aria-invalid='true']:focus {
		box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
	}

	.searchable-select-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 1000;
		max-height: 300px;
		overflow-y: auto;
		margin: 0;
		padding: 0;
		list-style: none;
		background: #fff;
		border: 2px solid #0066cc;
		border-top: none;
		border-radius: 0 0 6px 6px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.searchable-select-dropdown li {
		padding: 0.75rem 1rem;
		cursor: pointer;
		font-size: 0.95rem;
	}

	.searchable-select-dropdown li.highlighted {
		background-color: #e7f1ff;
	}

	.searchable-select-dropdown li.selected {
		background-color: #0066cc;
		color: #fff;
	}

	.searchable-select-dropdown li.selected.highlighted {
		background-color: #0052a3;
	}

	.searchable-select-dropdown li:hover:not(.no-results) {
		background-color: #e7f1ff;
	}

	.searchable-select-dropdown li.selected:hover {
		background-color: #0052a3;
	}

	.no-results {
		color: #6c757d;
		font-style: italic;
		cursor: default;
	}

	@media (prefers-color-scheme: dark) {
		input {
			background-color: #1a1a1a;
			color: #e9ecef;
			border-color: #495057;
		}

		input:hover:not(:focus) {
			border-color: #6c757d;
		}

		.searchable-select-dropdown {
			background: #2d2d2d;
			border-color: #0066cc;
		}

		.searchable-select-dropdown li {
			color: #e9ecef;
		}

		.searchable-select-dropdown li.highlighted {
			background-color: #3d4f66;
		}

		.searchable-select-dropdown li:hover:not(.no-results) {
			background-color: #3d4f66;
		}

		.no-results {
			color: #adb5bd;
		}
	}
</style>
