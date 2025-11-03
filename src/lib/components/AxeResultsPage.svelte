<script lang="ts">
	import type { AxeScanMessage, AxeViolation, AxeNode } from '$lib/services/axe-snippet';
	import type { Priority } from '$lib/types';
	import { t } from '$lib/i18n';
	import { wcagCriteria } from '$lib/wcag-criteria';
	import { ScreenshotService } from '$lib/services/screenshot';
	import { onMount } from 'svelte';

	interface Props {
		scanData: AxeScanMessage;
		onSave: (issues: ProcessedIssue[]) => void;
		onCancel: () => void;
	}

	let { scanData, onSave, onCancel }: Props = $props();

	// Process violations into issues
	interface ProcessedIssue {
		selected: boolean;
		accessibilityText: string;
		location: string;
		criterionNumber: string;
		title: string;
		description: string;
		notes: string;
		priority: Priority;
		impact: string;
		helpUrl: string;
		screenshot?: string;
	}

	let pageTitle = $state(scanData.pageTitle || '');
	let issues = $state<ProcessedIssue[]>([]);
	let pageTitleInput: HTMLInputElement | undefined = $state();

	// Initialize issues from scan data
	$effect(() => {
		issues = scanData.results.violations.flatMap((violation) =>
			violation.nodes.map((node) => processViolationNode(violation, node))
		);
	});

	function processViolationNode(violation: AxeViolation, node: AxeNode): ProcessedIssue {
		// Extract WCAG criteria from tags
		const wcagTags = violation.tags.filter((tag) => tag.startsWith('wcag'));
		const criterionNumber = extractCriterionNumber(wcagTags) || '';

		// Map impact to priority
		const priority = mapImpactToPriority(violation.impact);

		// Get accessibility text from failure summary or checks
		const accessibilityText = getAccessibilityText(node);

		// Format location combining CSS selector, accessible name, and HTML
		const location = formatLocationWithElement(node);

		return {
			selected: true,
			accessibilityText,
			location,
			criterionNumber,
			title: violation.help,
			description: violation.description,
			notes: node.failureSummary || '',
			priority,
			impact: violation.impact,
			helpUrl: violation.helpUrl
		};
	}

	function extractCriterionNumber(wcagTags: string[]): string | null {
		// Try to extract criterion number from tags like "wcag111", "wcag412", "wcag1312", etc.
		// Ignore level tags like "wcag2a", "wcag2aa", "wcag21aa", etc.
		for (const tag of wcagTags) {
			// Match patterns like wcag111, wcag412, wcag1312 (numbers only, no letters)
			const match = tag.match(/^wcag(\d)(\d)(\d+)$/);
			if (match) {
				// Convert wcag111 → 1.1.1, wcag412 → 4.1.2, wcag1312 → 1.3.12
				return `${match[1]}.${match[2]}.${match[3]}`;
			}
		}
		return null;
	}

	function mapImpactToPriority(impact: string): Priority {
		switch (impact) {
			case 'critical':
			case 'serious':
				return 3; // Blocker
			case 'moderate':
				return 2; // Medium
			case 'minor':
			default:
				return 1; // Low
		}
	}

	function getAccessibilityText(node: AxeNode): string {
		const texts: string[] = [];

		// Collect messages from checks
		[...(node.any || []), ...(node.all || []), ...(node.none || [])].forEach((check) => {
			if (check.message) {
				texts.push(check.message);
			}
		});

		return texts.join(' • ');
	}

	function formatLocation(target: string[]): string {
		return target.join(' > ');
	}

	function extractAccessibleName(html: string): string | null {
		// Try to extract accessible name from HTML element
		// Look for aria-label, aria-labelledby text, alt text, title, etc.
		const ariaLabelMatch = html.match(/aria-label="([^"]+)"/);
		if (ariaLabelMatch) {
			return ariaLabelMatch[1];
		}

		const altMatch = html.match(/alt="([^"]+)"/);
		if (altMatch) {
			return altMatch[1];
		}

		const titleMatch = html.match(/title="([^"]+)"/);
		if (titleMatch) {
			return titleMatch[1];
		}

		// Try to extract text content between tags
		const textMatch = html.match(/>([^<]+)</);
		if (textMatch && textMatch[1].trim()) {
			return textMatch[1].trim();
		}

		return null;
	}

	function formatLocationWithElement(node: AxeNode): string {
		const parts: string[] = [];

		// Add CSS selector
		const selector = formatLocation(node.target);
		parts.push(`Selector: ${selector}`);

		// Add accessible name if available
		if (node.html) {
			const accessibleName = extractAccessibleName(node.html);
			if (accessibleName) {
				parts.push(`Accessible Name: ${accessibleName}`);
			}

			// Add HTML element
			parts.push(`Element: ${node.html}`);
		}

		return parts.join('\n');
	}

	function toggleAll(select: boolean) {
		issues.forEach((issue) => {
			issue.selected = select;
		});
	}

	async function handleScreenshotChange(e: Event, index: number) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			try {
				issues[index].screenshot = await ScreenshotService.processScreenshot(file);
			} catch (error) {
				console.error('Failed to process screenshot:', error);
				alert('Failed to process screenshot: ' + (error as Error).message);
			}
		}
	}

	function removeScreenshot(index: number, inputElement: HTMLInputElement) {
		issues[index].screenshot = undefined;
		if (inputElement) {
			inputElement.value = '';
		}
	}

	function handleSave() {
		const selectedIssues = issues
			.filter((issue) => issue.selected)
			.map((issue) => ({
				...issue,
				pageTitle
			}));
		onSave(selectedIssues);
	}

	let selectedCount = $derived(issues.filter((issue) => issue.selected).length);

	onMount(() => {
		// Focus the page title input when the component mounts
		pageTitleInput?.focus();
	});
</script>

<div class="results-overlay">
<div class="results-page">
	<div class="header">
		<h1>{$t('axeResultsTitle')}</h1>
		<div class="header-info">
			<div class="scan-url">
				<strong>{$t('scanUrl')}:</strong>
				<a href={scanData.url} target="_blank" rel="noopener noreferrer">{scanData.url}</a>
			</div>
			<div class="issue-count">
				{selectedCount} / {issues.length} {$t('issuesDetected')}
			</div>
		</div>
	</div>

	<div class="page-title-section">
		<label for="page-title-input">
			{$t('pageTitle')}
		</label>
		<input
			id="page-title-input"
			type="text"
			bind:this={pageTitleInput}
			bind:value={pageTitle}
			placeholder={$t('pageTitlePlaceholder')}
		/>
	</div>

	<div class="controls">
		<button class="select-button" onclick={() => toggleAll(true)} type="button">
			{$t('selectAll')}
		</button>
		<button class="select-button" onclick={() => toggleAll(false)} type="button">
			{$t('deselectAll')}
		</button>
	</div>

	<div class="issues-container">
		{#each issues as issue, index (index)}
			<div class="issue-card" class:unselected={!issue.selected}>
				<div class="issue-header">
					<label class="checkbox-label">
						<input
							type="checkbox"
							bind:checked={issue.selected}
							aria-label="{$t('keepIssue')} {index + 1}: {issue.title}"
						/>
						<span class="issue-info">
							<span class="issue-number">#{index + 1}</span>
							<span class="issue-title-preview">{issue.title}</span>
						</span>
					</label>
					<span class="impact-badge impact-{issue.impact}">{issue.impact}</span>
				</div>

				{#if issue.selected}
				<div class="issue-field">
					<label for="criterion-{index}">
						{$t('wcagCriterion')}
					</label>
					<select id="criterion-{index}" bind:value={issue.criterionNumber}>
						<option value="">{$t('selectCriterion')}</option>
						{#each wcagCriteria as criterion}
							<option value={criterion.number}>
								{criterion.number} - {criterion.title} ({criterion.level})
							</option>
						{/each}
					</select>
				</div>

				<div class="issue-field">
					<label for="priority-{index}">
						{$t('priority')}
					</label>
					<select id="priority-{index}" bind:value={issue.priority}>
						<option value={1}>{$t('priorityLow')}</option>
						<option value={2}>{$t('priorityMedium')}</option>
						<option value={3}>{$t('priorityBlocker')}</option>
					</select>
				</div>

				<div class="issue-field">
					<label for="title-{index}">
						{$t('issueTitle')}
					</label>
					<input id="title-{index}" type="text" bind:value={issue.title} />
				</div>

				<div class="issue-field">
					<label for="description-{index}">
						{$t('issueDescription')}
					</label>
					<textarea id="description-{index}" bind:value={issue.description} rows="4"></textarea>
				</div>

				<div class="issue-field">
					<label for="location-{index}">
						{$t('issueLocation')}
					</label>
					<textarea id="location-{index}" bind:value={issue.location} rows="5"></textarea>
				</div>

				<div class="issue-field">
					<label for="screenshot-{index}">
						{$t('screenshot')} <span class="optional-indicator">({$t('optional')})</span>
					</label>
					<input
						type="file"
						id="screenshot-{index}"
						accept="image/*"
						onchange={(e) => handleScreenshotChange(e, index)}
						aria-describedby="screenshot-help-{index}"
					/>
					<div id="screenshot-help-{index}" class="help-text">{$t('screenshotHelp')}</div>
					{#if issue.screenshot}
						<div class="screenshot-preview">
							<img src={issue.screenshot} alt={issue.title} />
							<button
								type="button"
								onclick={(e) => {
									const input = document.getElementById(`screenshot-${index}`) as HTMLInputElement;
									removeScreenshot(index, input);
								}}
								class="remove-screenshot-btn"
							>
								{$t('removeScreenshot')}
							</button>
						</div>
					{/if}
				</div>

				<div class="issue-field">
					<label for="notes-{index}">
						{$t('notesAndSolutions')}
					</label>
					<textarea id="notes-{index}" bind:value={issue.notes} rows="4"></textarea>
				</div>

				{#if issue.accessibilityText}
					<div class="issue-field">
						<div class="field-label">{$t('wcagTags')}</div>
						<div class="readonly-text">{issue.accessibilityText}</div>
					</div>
				{/if}

				<div class="issue-field">
					<div class="field-label">{$t('helpUrl')}</div>
					<a href={issue.helpUrl} target="_blank" rel="noopener noreferrer" class="help-link">
						{issue.helpUrl}
					</a>
				</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="actions">
		<button class="save-button" onclick={handleSave} type="button">{$t('save')}</button>
		<button class="cancel-button" onclick={onCancel} type="button">{$t('cancel')}</button>
	</div>
</div>
</div>

<style>
	.results-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		overflow-y: auto;
	}

	.results-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		background: #f8f9fa;
		min-height: 100vh;
	}

	.header {
		margin-bottom: 2rem;
	}

	.header h1 {
		margin: 0 0 1rem 0;
		font-size: 2rem;
	}

	.header-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.scan-url {
		font-size: 0.875rem;
	}

	.scan-url a {
		color: #3b82f6;
		text-decoration: none;
		margin-left: 0.5rem;
	}

	.scan-url a:hover {
		text-decoration: underline;
	}

	.issue-count {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.page-title-section {
		background: white;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
	}

	.page-title-section label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
		font-size: 0.9375rem;
	}

	.page-title-section input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
		font-family: inherit;
	}

	.page-title-section input:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		border-color: #3b82f6;
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.select-button {
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.select-button:hover {
		background: #e5e7eb;
	}

	.issues-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.issue-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		transition: opacity 0.2s;
	}

	.issue-card.unselected {
		opacity: 0.5;
	}

	.issue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: 600;
		font-size: 1.125rem;
	}

	.checkbox-label input[type='checkbox'] {
		width: 1.25rem;
		height: 1.25rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.issue-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.issue-number {
		color: #6b7280;
		font-weight: 600;
		flex-shrink: 0;
	}

	.issue-title-preview {
		color: #374151;
		font-weight: 500;
		font-size: 0.9375rem;
	}

	.issue-card.unselected .issue-header {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}

	.impact-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.impact-minor {
		background: #dbeafe;
		color: #1e40af;
	}

	.impact-moderate {
		background: #fef3c7;
		color: #92400e;
	}

	.impact-serious {
		background: #fed7aa;
		color: #9a3412;
	}

	.impact-critical {
		background: #fee2e2;
		color: #991b1b;
	}

	.issue-field {
		margin-bottom: 1rem;
	}

	.issue-field label,
	.issue-field .field-label {
		display: block;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.issue-field input,
	.issue-field select,
	.issue-field textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.issue-field textarea {
		font-family: inherit;
		resize: vertical;
	}

	.issue-field input:focus,
	.issue-field select:focus,
	.issue-field textarea:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		border-color: #3b82f6;
	}

	.readonly-text {
		padding: 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #4b5563;
	}

	.optional-indicator {
		color: #6b7280;
		font-weight: normal;
		font-size: 0.875rem;
	}

	.help-text {
		color: #6b7280;
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.issue-field input[type='file'] {
		padding: 0.5rem 0;
		border: none;
	}

	.screenshot-preview {
		margin-top: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.screenshot-preview img {
		max-width: 100%;
		height: auto;
		display: block;
		margin-bottom: 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
	}

	.remove-screenshot-btn {
		padding: 0.5rem 1rem;
		background: #ef4444;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.remove-screenshot-btn:hover {
		background: #dc2626;
	}

	.remove-screenshot-btn:active {
		background: #b91c1c;
	}

	.help-link {
		color: #3b82f6;
		text-decoration: none;
		font-size: 0.875rem;
		word-break: break-all;
	}

	.help-link:hover {
		text-decoration: underline;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 2px solid #e5e7eb;
	}

	.save-button,
	.cancel-button {
		padding: 0.75rem 2rem;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-button {
		background: #3b82f6;
		color: white;
	}

	.save-button:hover {
		background: #2563eb;
	}

	.cancel-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.cancel-button:hover {
		background: #e5e7eb;
	}

	@media (max-width: 768px) {
		.results-page {
			padding: 1rem;
		}

		.header h1 {
			font-size: 1.5rem;
		}

		.header-info {
			flex-direction: column;
			align-items: flex-start;
		}

		.actions {
			flex-direction: column;
		}

		.save-button,
		.cancel-button {
			width: 100%;
		}
	}
</style>
