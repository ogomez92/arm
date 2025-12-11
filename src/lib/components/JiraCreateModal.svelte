<script lang="ts">
	import { t, currentLanguage } from '../i18n';
	import type { JiraConfig, Issue } from '../types';
	import { JiraService, type JiraCreateIssueResponse, type JiraUrlParseResult } from '../services/jira';

	let {
		issue,
		jiraConfig,
		onSuccess,
		onCancel,
		onConfigureJira
	}: {
		issue: Issue;
		jiraConfig: JiraConfig;
		onSuccess: (ticketUrl: string, ticketKey: string) => void;
		onCancel: () => void;
		onConfigureJira: () => void;
	} = $props();

	// Initialize from issue data
	const initialData = JiraService.issueToJiraData(issue, jiraConfig.projectKey || '', $currentLanguage);

	let jiraUrlInput = $state(jiraConfig.projectKey || '');
	let parsedResult = $state<JiraUrlParseResult | null>(null);
	let summary = $state(initialData.summary);
	let description = $state(initialData.description);
	let issueType = $state(initialData.issueType);
	let priority = $state(initialData.priority || 'Medium');
	let labels = $state(initialData.labels?.join(', ') || '');

	// Parse URL/project key when input changes
	$effect(() => {
		if (jiraUrlInput.trim()) {
			parsedResult = JiraService.parseJiraUrl(jiraUrlInput.trim());
		} else {
			parsedResult = null;
		}
	});

	let isCreating = $state(false);
	let creationResult = $state<'success' | 'error' | null>(null);
	let errorMessage = $state('');
	let createdTicket = $state<JiraCreateIssueResponse | null>(null);
	let ticketUrl = $state('');

	let firstInput: HTMLInputElement | undefined = $state();
	let modalElement: HTMLDivElement | undefined = $state();
	let previouslyFocusedElement: HTMLElement | null = null;

	$effect(() => {
		// Store previously focused element
		previouslyFocusedElement = document.activeElement as HTMLElement;

		// Focus first input
		setTimeout(() => {
			firstInput?.focus();
		}, 0);

		// Return cleanup function to restore focus
		return () => {
			previouslyFocusedElement?.focus();
		};
	});

	// Focus trap: keep focus within modal
	function trapFocus(e: KeyboardEvent) {
		if (e.key !== 'Tab' || !modalElement) return;

		const focusableElements = modalElement.querySelectorAll<HTMLElement>(
			'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
		);
		const firstFocusable = focusableElements[0];
		const lastFocusable = focusableElements[focusableElements.length - 1];

		if (e.shiftKey) {
			// Shift + Tab
			if (document.activeElement === firstFocusable) {
				e.preventDefault();
				lastFocusable?.focus();
			}
		} else {
			// Tab
			if (document.activeElement === lastFocusable) {
				e.preventDefault();
				firstFocusable?.focus();
			}
		}
	}

	async function handleSubmit() {
		if (!parsedResult || !summary) {
			return;
		}

		isCreating = true;
		creationResult = null;
		errorMessage = '';

		try {
			const service = new JiraService(jiraConfig);
			const labelsArray = labels
				.split(',')
				.map((l) => l.trim())
				.filter((l) => l.length > 0);

			const response = await service.createIssue({
				projectKey: parsedResult.projectKey,
				summary,
				description,
				issueType,
				priority,
				labels: labelsArray,
				parentEpicKey: parsedResult.epicKey
			});

			createdTicket = response;
			ticketUrl = service.getTicketUrl(response.key);
			creationResult = 'success';
		} catch (e) {
			creationResult = 'error';
			errorMessage = (e as Error).message;
		} finally {
			isCreating = false;
		}
	}

	function handleSuccessClose() {
		if (createdTicket && ticketUrl) {
			onSuccess(ticketUrl, createdTicket.key);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && creationResult !== 'success') {
			onCancel();
		} else {
			trapFocus(e);
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget && creationResult !== 'success') {
			onCancel();
		}
	}
</script>

<div
	class="modal-overlay"
	onclick={handleOverlayClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-labelledby="jira-create-title"
	aria-modal="true"
	tabindex="-1"
>
	<div class="modal modal-large" bind:this={modalElement}>
		<h2 id="jira-create-title">{$t('createJiraTicket')}</h2>

		{#if creationResult === 'success' && createdTicket}
			<!-- Success State -->
			<div class="result-container" role="alert" aria-live="polite">
				<div class="success-message">
					<span class="success-icon" aria-hidden="true">&#10003;</span>
					<p>{$t('jiraTicketCreatedWithKey').replace('{key}', createdTicket.key)}</p>
				</div>
				<a
					href={ticketUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="ticket-link"
				>
					{$t('jiraViewTicket')}: {createdTicket.key}
				</a>
				<div class="modal-actions">
					<button type="button" onclick={handleSuccessClose} class="btn-primary">
						{$t('jiraClose')}
					</button>
				</div>
			</div>
		{:else}
			<!-- Form State -->
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="config-info">
					<p>
						<strong>{$t('jiraBaseUrl')}:</strong> {jiraConfig.baseUrl}
						<button type="button" class="btn-link" onclick={onConfigureJira}>
							({$t('edit')})
						</button>
					</p>
				</div>

				<div class="form-group">
					<label for="jiraUrl">Jira URL or Project Key <span class="required">*</span></label>
					<input
						type="text"
						id="jiraUrl"
						bind:value={jiraUrlInput}
						bind:this={firstInput}
						placeholder="https://company.atlassian.net/browse/PROJ-123 or PROJ"
						required
					/>
					{#if parsedResult}
						<p class="detected-info" role="status" aria-live="polite">
							<strong>Detected:</strong> {parsedResult.label}
							{#if parsedResult.type === 'epic'}
								<span class="info-badge">Will link as parent epic</span>
							{/if}
						</p>
					{:else if jiraUrlInput.trim()}
						<p class="help-text error-text">Could not parse URL. Please enter a valid Jira URL or project key.</p>
					{:else}
						<p class="help-text">Paste any Jira URL (board, epic, project) or just the project key</p>
					{/if}
				</div>

				<div class="form-group">
					<label for="jiraSummary">{$t('jiraSummary')} <span class="required">*</span></label>
					<input
						type="text"
						id="jiraSummary"
						bind:value={summary}
						required
					/>
				</div>

				<div class="form-group">
					<label for="jiraDescription">{$t('jiraDescription')}</label>
					<textarea
						id="jiraDescription"
						bind:value={description}
						rows="8"
					></textarea>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="jiraIssueType">{$t('jiraIssueType')}</label>
						<select id="jiraIssueType" bind:value={issueType}>
							<option value="Bug">{$t('jiraIssueTypeBug')}</option>
							<option value="Task">{$t('jiraIssueTypeTask')}</option>
							<option value="Story">{$t('jiraIssueTypeStory')}</option>
						</select>
					</div>

					<div class="form-group">
						<label for="jiraPriority">{$t('jiraPriority')}</label>
						<select id="jiraPriority" bind:value={priority}>
							<option value="Highest">{$t('jiraPriorityHighest')}</option>
							<option value="High">{$t('jiraPriorityHigh')}</option>
							<option value="Medium">{$t('jiraPriorityMedium')}</option>
							<option value="Low">{$t('jiraPriorityLow')}</option>
							<option value="Lowest">{$t('jiraPriorityLowest')}</option>
						</select>
					</div>
				</div>

				<div class="form-group">
					<label for="jiraLabels">{$t('jiraLabels')}</label>
					<input
						type="text"
						id="jiraLabels"
						bind:value={labels}
						placeholder={$t('jiraLabelsPlaceholder')}
					/>
					<p class="help-text">Comma-separated list of labels</p>
				</div>

				{#if creationResult === 'error'}
					<div class="error-message" role="alert">
						<strong>{$t('jiraTicketError')}:</strong> {errorMessage}
					</div>
				{/if}

				<div class="modal-actions">
					<button type="submit" class="btn-primary" disabled={isCreating || !parsedResult || !summary}>
						{isCreating ? $t('jiraCreating') : $t('jiraCreateTicket')}
					</button>
					<button type="button" onclick={onCancel} class="btn-secondary" disabled={isCreating}>
						{$t('jiraCancel')}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1000;
	}

	.modal {
		background: #ffffff;
		padding: 2rem;
		border-radius: 8px;
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.modal-large {
		max-width: 700px;
	}

	.modal h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
	}

	.config-info {
		background-color: #f8f9fa;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin-bottom: 1.25rem;
	}

	.config-info p {
		margin: 0;
		font-size: 0.875rem;
	}

	.btn-link {
		background: none;
		border: none;
		color: #0066cc;
		cursor: pointer;
		padding: 0;
		font-size: 0.875rem;
		text-decoration: underline;
	}

	.btn-link:hover {
		color: #0052a3;
	}

	.btn-link:focus {
		outline: 2px solid #0066cc;
		outline-offset: 2px;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.required {
		color: #dc3545;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		border: 2px solid #ced4da;
		border-radius: 4px;
		font-family: inherit;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 150px;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.help-text {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		color: #6c757d;
	}

	.error-text {
		color: #dc3545;
	}

	.detected-info {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		color: #155724;
		background-color: #d4edda;
		border: 1px solid #c3e6cb;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.info-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		background-color: #0066cc;
		color: white;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.result-container {
		text-align: center;
		padding: 1rem 0;
	}

	.success-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background-color: #d4edda;
		border: 1px solid #c3e6cb;
		border-radius: 4px;
		color: #155724;
	}

	.success-icon {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.success-message p {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 500;
	}

	.ticket-link {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background-color: #f8f9fa;
		border: 2px solid #0066cc;
		border-radius: 4px;
		color: #0066cc;
		text-decoration: none;
		font-weight: 500;
		margin-bottom: 1.5rem;
	}

	.ticket-link:hover {
		background-color: #e9ecef;
	}

	.ticket-link:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.error-message {
		padding: 0.75rem 1rem;
		background-color: #f8d7da;
		border: 1px solid #f5c6cb;
		border-radius: 4px;
		color: #721c24;
		margin-bottom: 1rem;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		justify-content: center;
	}

	.btn-primary,
	.btn-secondary {
		display: inline-block;
		padding: 0.625rem 1.25rem;
		font-size: 1rem;
		font-weight: 500;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background-color: #0066cc;
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #0052a3;
	}

	.btn-primary:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
	}

	.btn-primary:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: #6c757d;
		color: #ffffff;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #5a6268;
	}

	.btn-secondary:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(108, 117, 125, 0.5);
	}

	.btn-secondary:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}

	@media (max-width: 600px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
