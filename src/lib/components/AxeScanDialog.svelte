<script lang="ts">
	import { AxeSnippetService } from '$lib/services/axe-snippet';
	import { t } from '$lib/i18n';
	import Announcer from './Announcer.svelte';
	import { onMount } from 'svelte';

	interface Props {
		onClose: () => void;
		onImportResults: (data: any) => void;
	}

	let { onClose, onImportResults }: Props = $props();

	let snippet = $state(AxeSnippetService.generateSnippet());
	let announceMessage = $state('');
	let dialogElement: HTMLDivElement | undefined = $state();
	let copyButton: HTMLButtonElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();

	async function handleCopy() {
		const success = await AxeSnippetService.copyToClipboard();
		if (success) {
			announceMessage = $t('snippetCopied');
			setTimeout(() => {
				announceMessage = '';
			}, 3000);
		}
	}

	async function handleFileImport(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			try {
				const text = await file.text();
				const data = JSON.parse(text);

				// Validate that this is an axe scan result
				if (data.type === 'AXE_SCAN_RESULTS' && data.results) {
					onImportResults(data);
					announceMessage = $t('scanResultsImported');
					setTimeout(() => {
						announceMessage = '';
					}, 3000);
				} else {
					alert('Invalid scan results file. Please select a valid axe scan results JSON file.');
				}

				// Reset file input
				target.value = '';
			} catch (error) {
				console.error('Failed to import scan results:', error);
				alert('Failed to import scan results: ' + (error as Error).message);
			}
		}
	}

	function handleImportClick() {
		fileInput?.click();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	onMount(() => {
		// Focus the copy button when dialog opens
		copyButton?.focus();
	});
</script>

<div class="dialog-overlay" onclick={onClose} onkeydown={handleKeydown} role="presentation">
	<div
		bind:this={dialogElement}
		class="dialog"
		onclick={(e) => e.stopPropagation()}
		onkeydown={handleKeydown}
		role="dialog"
		aria-labelledby="dialog-title"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="dialog-header">
			<h2 id="dialog-title">{$t('axeScanTitle')}</h2>
			<button class="close-button" onclick={onClose} aria-label={$t('closeDialog')} type="button">
				×
			</button>
		</div>

		<div class="dialog-content">
			<p class="instructions-title">{$t('axeScanInstructions')}</p>
			<ol class="instructions-list">
				<li>{$t('axeScanStep1')}</li>
				<li>{$t('axeScanStep2')}</li>
				<li>{$t('axeScanStep3')}</li>
				<li>{$t('axeScanStep4')}</li>
				<li>{$t('axeScanStep5')}</li>
				<li>{$t('axeScanStep6')}</li>
			</ol>

			<div class="snippet-container">
				<textarea
					class="snippet-textarea"
					readonly
					value={snippet}
					onclick={(e) => e.currentTarget.select()}
					aria-label="Code snippet"
				></textarea>
				<button bind:this={copyButton} class="copy-button" onclick={handleCopy} type="button">
					{$t('copySnippet')}
				</button>
			</div>

			<div class="import-section">
				<p class="import-instructions">{$t('orImportResults')}</p>
				<input
					bind:this={fileInput}
					type="file"
					accept=".json"
					onchange={handleFileImport}
					class="file-input-hidden"
					aria-label={$t('importScanResults')}
				/>
				<button class="import-button" onclick={handleImportClick} type="button">
					{$t('importScanResults')}
				</button>
			</div>

			{#if announceMessage}
				<div class="success-message" role="status" aria-live="polite">
					{announceMessage}
				</div>
			{/if}
		</div>
	</div>
</div>

<Announcer bind:message={announceMessage} />

<style>
	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.dialog {
		background: white;
		border-radius: 8px;
		max-width: 700px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.dialog-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		line-height: 1;
		cursor: pointer;
		color: #6b7280;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
	}

	.close-button:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.dialog-content {
		padding: 1.5rem;
	}

	.instructions-title {
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.instructions-list {
		margin: 0 0 1.5rem 0;
		padding-left: 1.5rem;
	}

	.instructions-list li {
		margin-bottom: 0.5rem;
		line-height: 1.6;
	}

	.snippet-container {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		padding: 1rem;
	}

	.snippet-textarea {
		width: 100%;
		height: 200px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
		font-size: 0.875rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 0.75rem;
		margin-bottom: 1rem;
		resize: vertical;
	}

	.snippet-textarea:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.copy-button {
		width: 100%;
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.copy-button:hover {
		background: #2563eb;
	}

	.copy-button:active {
		background: #1d4ed8;
	}

	.import-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
		text-align: center;
	}

	.import-instructions {
		margin: 0 0 1rem 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.file-input-hidden {
		display: none;
	}

	.import-button {
		width: 100%;
		background: #6b7280;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.import-button:hover {
		background: #4b5563;
	}

	.import-button:active {
		background: #374151;
	}

	.success-message {
		margin-top: 1rem;
		padding: 0.75rem;
		background: #d1fae5;
		border: 1px solid #6ee7b7;
		border-radius: 6px;
		color: #065f46;
		font-weight: 500;
	}
</style>
