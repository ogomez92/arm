<script lang="ts">
	import { onMount } from 'svelte';

	interface MenuItem {
		id: string;
		label: string;
		onClick: () => void;
	}

	interface Props {
		buttonLabel: string;
		items: MenuItem[];
	}

	let { buttonLabel, items }: Props = $props();

	let isOpen = $state(false);
	let buttonElement: HTMLButtonElement | undefined = $state();
	let menuElement: HTMLDivElement | undefined = $state();
	let focusedIndex = $state(-1);

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			focusedIndex = -1;
			// Focus the first menu item when opened
			setTimeout(() => {
				focusMenuItem(0);
			}, 0);
		} else {
			// Return focus to button when closed
			setTimeout(() => {
				buttonElement?.focus();
			}, 0);
		}
	}

	function closeDropdown() {
		if (isOpen) {
			isOpen = false;
			focusedIndex = -1;
			setTimeout(() => {
				buttonElement?.focus();
			}, 0);
		}
	}

	function handleButtonKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleDropdown();
		} else if (e.key === 'ArrowDown' && isOpen) {
			e.preventDefault();
			focusMenuItem(0);
		} else if (e.key === 'ArrowUp' && isOpen) {
			e.preventDefault();
			focusMenuItem(items.length - 1);
		} else if (e.key === 'Escape' && isOpen) {
			e.preventDefault();
			closeDropdown();
		}
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeDropdown();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			const nextIndex = (focusedIndex + 1) % items.length;
			focusMenuItem(nextIndex);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prevIndex = focusedIndex <= 0 ? items.length - 1 : focusedIndex - 1;
			focusMenuItem(prevIndex);
		} else if (e.key === 'Home') {
			e.preventDefault();
			focusMenuItem(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			focusMenuItem(items.length - 1);
		} else if (e.key === 'Tab') {
			// Close on tab
			closeDropdown();
		}
	}

	function handleMenuItemClick(item: MenuItem) {
		item.onClick();
		closeDropdown();
	}

	function handleMenuItemKeydown(e: KeyboardEvent, item: MenuItem) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleMenuItemClick(item);
		}
	}

	function focusMenuItem(index: number) {
		focusedIndex = index;
		const menuItems = menuElement?.querySelectorAll('[role="menuitem"]');
		if (menuItems && menuItems[index]) {
			(menuItems[index] as HTMLElement).focus();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (
			isOpen &&
			menuElement &&
			buttonElement &&
			!menuElement.contains(e.target as Node) &&
			!buttonElement.contains(e.target as Node)
		) {
			closeDropdown();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="export-dropdown">
	<button
		bind:this={buttonElement}
		type="button"
		class="btn-secondary dropdown-button"
		onclick={toggleDropdown}
		onkeydown={handleButtonKeydown}
		aria-haspopup="true"
		aria-expanded={isOpen}
	>
		{buttonLabel}
		<svg
			class="dropdown-icon"
			class:open={isOpen}
			width="12"
			height="12"
			viewBox="0 0 12 12"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="2" fill="none" />
		</svg>
	</button>

	{#if isOpen}
		<div
			bind:this={menuElement}
			class="dropdown-menu"
			role="menu"
			tabindex="-1"
			onkeydown={handleMenuKeydown}
		>
			{#each items as item, index (item.id)}
				<button
					type="button"
					role="menuitem"
					class="menu-item"
					onclick={() => handleMenuItemClick(item)}
					onkeydown={(e) => handleMenuItemKeydown(e, item)}
					tabindex={index === focusedIndex ? 0 : -1}
				>
					{item.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.export-dropdown {
		position: relative;
		display: inline-block;
	}

	.dropdown-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dropdown-icon {
		transition: transform 0.2s ease;
	}

	.dropdown-icon.open {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.25rem);
		right: 0;
		min-width: 100%;
		background-color: #ffffff;
		border: 2px solid #ced4da;
		border-radius: 4px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		overflow: hidden;
	}

	.menu-item {
		display: block;
		width: 100%;
		padding: 0.625rem 1rem;
		border: none;
		background: none;
		text-align: left;
		font-size: 1rem;
		font-weight: 500;
		color: #212529;
		cursor: pointer;
		transition: background-color 0.15s ease;
		white-space: nowrap;
	}

	.menu-item:hover,
	.menu-item:focus {
		background-color: #f8f9fa;
		outline: none;
	}

	.menu-item:focus {
		background-color: #e9ecef;
	}

	.menu-item:active {
		background-color: #dee2e6;
	}
</style>
