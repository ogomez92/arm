<script lang="ts">
	import { t } from '../i18n';
	import type { JiraConfig } from '../types';
	import { JiraService } from '../services/jira';

	let {
		initialConfig,
		onSave,
		onCancel
	}: {
		initialConfig?: JiraConfig;
		onSave: (config: JiraConfig) => void;
		onCancel: () => void;
	} = $props();

	let baseUrl = $state(initialConfig?.baseUrl || '');
	let apiToken = $state(initialConfig?.apiToken || '');
	let userEmail = $state(initialConfig?.userEmail || '');
	let projectKey = $state(initialConfig?.projectKey || '');
	let isTestingConnection = $state(false);
	let connectionTestResult = $state<'success' | 'error' | null>(null);
	let errorMessage = $state('');

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

	async function testConnection() {
		if (!baseUrl || !apiToken || !userEmail) {
			return;
		}

		isTestingConnection = true;
		connectionTestResult = null;
		errorMessage = '';

		try {
			const service = new JiraService({
				baseUrl,
				apiToken,
				userEmail,
				projectKey
			});

			const success = await service.testConnection();
			connectionTestResult = success ? 'success' : 'error';
			if (!success) {
				errorMessage = 'Connection failed. Please check your credentials.';
			}
		} catch (e) {
			connectionTestResult = 'error';
			errorMessage = (e as Error).message;
		} finally {
			isTestingConnection = false;
		}
	}

	function handleSubmit() {
		if (!baseUrl || !apiToken || !userEmail) {
			return;
		}

		const config: JiraConfig = {
			baseUrl: baseUrl.trim(),
			apiToken: apiToken.trim(),
			userEmail: userEmail.trim(),
			projectKey: projectKey.trim() || undefined
		};

		onSave(config);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		} else {
			trapFocus(e);
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	}
</script>

<div
	class="modal-overlay"
	onclick={handleOverlayClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-labelledby="jira-config-title"
	aria-modal="true"
	tabindex="-1"
>
	<div class="modal" bind:this={modalElement}>
		<h2 id="jira-config-title">{$t('jiraConfiguration')}</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<div class="form-group">
				<label for="jiraBaseUrl">{$t('jiraBaseUrl')} <span class="required">*</span></label>
				<input
					type="url"
					id="jiraBaseUrl"
					bind:value={baseUrl}
					bind:this={firstInput}
					placeholder={$t('jiraBaseUrlPlaceholder')}
					required
				/>
				<p class="help-text">{$t('jiraBaseUrlHelp')}</p>
			</div>

			<div class="form-group">
				<label for="jiraUserEmail">{$t('jiraUserEmail')} <span class="required">*</span></label>
				<input
					type="email"
					id="jiraUserEmail"
					bind:value={userEmail}
					placeholder={$t('jiraUserEmailPlaceholder')}
					required
				/>
				<p class="help-text">{$t('jiraUserEmailHelp')}</p>
			</div>

			<div class="form-group">
				<label for="jiraApiToken">{$t('jiraApiToken')} <span class="required">*</span></label>
				<input
					type="password"
					id="jiraApiToken"
					bind:value={apiToken}
					placeholder={$t('jiraApiTokenPlaceholder')}
					required
				/>
				<p class="help-text">{$t('jiraApiTokenHelp')}</p>
			</div>

			<div class="form-group">
				<label for="jiraProjectKey">{$t('jiraProjectKey')}</label>
				<input
					type="text"
					id="jiraProjectKey"
					bind:value={projectKey}
					placeholder={$t('jiraProjectKeyPlaceholder')}
				/>
				<p class="help-text">{$t('jiraProjectKeyHelp')}</p>
			</div>

			<div class="privacy-notice">
				<p>{$t('jiraProxyDisclaimer')}</p>
			</div>

			{#if connectionTestResult}
				<div
					class="connection-status"
					class:success={connectionTestResult === 'success'}
					class:error={connectionTestResult === 'error'}
					role="alert"
				>
					{#if connectionTestResult === 'success'}
						Connection successful!
					{:else}
						{errorMessage || 'Connection failed'}
					{/if}
				</div>
			{/if}

			<div class="modal-actions">
				<button
					type="button"
					onclick={testConnection}
					class="btn-secondary"
					disabled={isTestingConnection || !baseUrl || !apiToken || !userEmail}
				>
					{isTestingConnection ? 'Testing...' : 'Test Connection'}
				</button>
				<button type="submit" class="btn-primary" disabled={!baseUrl || !apiToken || !userEmail}>
					{$t('jiraSaveConfig')}
				</button>
				<button type="button" onclick={onCancel} class="btn-secondary">
					{$t('jiraCancel')}
				</button>
			</div>
		</form>
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

	.modal h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.required {
		color: #dc3545;
	}

	.form-group input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		border: 2px solid #ced4da;
		border-radius: 4px;
	}

	.form-group input:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.help-text {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		color: #6c757d;
	}

	.privacy-notice {
		padding: 1rem;
		background-color: #e7f3ff;
		border-left: 4px solid #0066cc;
		border-radius: 4px;
		margin-bottom: 1.25rem;
	}

	.privacy-notice p {
		margin: 0;
		font-size: 0.875rem;
		color: #1a1a1a;
		line-height: 1.5;
	}

	.connection-status {
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-weight: 500;
	}

	.connection-status.success {
		background-color: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.connection-status.error {
		background-color: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		flex-wrap: wrap;
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
</style>
