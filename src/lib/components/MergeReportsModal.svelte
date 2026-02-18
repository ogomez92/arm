<script lang="ts">
	import { t } from '../i18n';
	import type { Report } from '../types';
	import { ReportStorage } from '../services/storage';

	interface Props {
		onMerge: (mergedReport: Report) => void;
		onCancel: () => void;
	}

	let { onMerge, onCancel }: Props = $props();

	let report1 = $state<Report | null>(null);
	let report2 = $state<Report | null>(null);
	let mergedTitle = $state('');
	let fileInput1: HTMLInputElement | undefined = $state();
	let fileInput2: HTMLInputElement | undefined = $state();
	let titleInput: HTMLInputElement | undefined = $state();
	let error = $state('');
	let isLoading = $state(false);

	const canMerge = $derived(report1 !== null && report2 !== null && mergedTitle.trim() !== '');

	$effect(() => {
		// Auto-fill title from first report when loaded
		if (report1 && !mergedTitle) {
			mergedTitle = report1.name;
		}
	});

	$effect(() => {
		// Focus title input once modal opens
		setTimeout(() => {
			if (titleInput) {
				titleInput.focus();
			}
		}, 0);
	});

	async function handleFileUpload1(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isLoading = true;
		error = '';

		try {
			report1 = await ReportStorage.loadReportFromFile(file);
			// Auto-fill title from first report
			if (!mergedTitle) {
				mergedTitle = report1.name;
			}
		} catch (err) {
			error = `${$t('errorLoadingReport')}: ${(err as Error).message}`;
			report1 = null;
		} finally {
			isLoading = false;
		}
	}

	async function handleFileUpload2(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isLoading = true;
		error = '';

		try {
			report2 = await ReportStorage.loadReportFromFile(file);
		} catch (err) {
			error = `${$t('errorLoadingReport')}: ${(err as Error).message}`;
			report2 = null;
		} finally {
			isLoading = false;
		}
	}

	function handleMerge() {
		if (!report1 || !report2 || !mergedTitle.trim()) return;

		try {
			const mergedReport = ReportStorage.mergeReports(report1, report2, mergedTitle.trim());
			onMerge(mergedReport);
		} catch (err) {
			error = `${$t('errorMergingReports')}: ${(err as Error).message}`;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
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
	aria-labelledby="merge-dialog-title"
	aria-modal="true"
	tabindex="-1"
>
	<div class="modal">
		<h2 id="merge-dialog-title">{$t('mergeReportsTitle')}</h2>
		<p class="description">{$t('mergeReportsDescription')}</p>

		{#if error}
			<div class="error-message" role="alert">
				{error}
			</div>
		{/if}

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleMerge();
			}}
		>
			<div class="form-group">
				<label for="mergedTitle">{$t('mergedReportTitle')}:</label>
				<input
					type="text"
					id="mergedTitle"
					bind:value={mergedTitle}
					bind:this={titleInput}
					placeholder={$t('reportNamePlaceholder')}
					required
				/>
			</div>

			<div class="upload-section">
				<div class="upload-card">
					<h3>{$t('firstReport')}</h3>
					<input
						type="file"
						id="report1"
						accept=".json"
						bind:this={fileInput1}
						onchange={handleFileUpload1}
						class="file-input"
						aria-describedby="report1-status"
					/>
					<label for="report1" class="upload-button">
						{$t('selectFirstReport')}
					</label>
					<div id="report1-status" class="upload-status" class:loaded={report1}>
						{#if report1}
							<span class="success-icon" aria-hidden="true">&#10003;</span>
							<span class="report-info">
								<strong>{report1.name}</strong>
								<span class="report-meta">
									{report1.issues.length}
									{$t('issuesCount')} &bull; {report1.pages.length}
									{$t('pagesCount')}
								</span>
							</span>
						{:else}
							<span class="placeholder">{$t('selectFirstReport')}</span>
						{/if}
					</div>
				</div>

				<div class="upload-card">
					<h3>{$t('secondReport')}</h3>
					<input
						type="file"
						id="report2"
						accept=".json"
						bind:this={fileInput2}
						onchange={handleFileUpload2}
						class="file-input"
						aria-describedby="report2-status"
					/>
					<label for="report2" class="upload-button">
						{$t('selectSecondReport')}
					</label>
					<div id="report2-status" class="upload-status" class:loaded={report2}>
						{#if report2}
							<span class="success-icon" aria-hidden="true">&#10003;</span>
							<span class="report-info">
								<strong>{report2.name}</strong>
								<span class="report-meta">
									{report2.issues.length}
									{$t('issuesCount')} &bull; {report2.pages.length}
									{$t('pagesCount')}
								</span>
							</span>
						{:else}
							<span class="placeholder">{$t('selectSecondReport')}</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="modal-actions">
				<button type="submit" class="btn-primary" disabled={!canMerge || isLoading}>
					{$t('merge')}
				</button>
				<button type="button" onclick={onCancel} class="btn-secondary">
					{$t('cancel')}
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
		border-radius: 12px;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
	}

	.modal h2 {
		margin: 0 0 0.75rem 0;
		font-size: 1.5rem;
		color: #1a1a1a;
	}

	.description {
		margin: 0 0 1.5rem 0;
		color: #6c757d;
		line-height: 1.5;
	}

	.error-message {
		background-color: #f8d7da;
		color: #721c24;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		border: 1px solid #f5c6cb;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #212529;
	}

	.form-group input[type='text'] {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		border: 2px solid #ced4da;
		border-radius: 6px;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		box-sizing: border-box;
	}

	.form-group input[type='text']:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.upload-section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.upload-card {
		background: #f8f9fa;
		border: 2px dashed #ced4da;
		border-radius: 8px;
		padding: 1.25rem;
		text-align: center;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.upload-card:has(.loaded) {
		border-color: #28a745;
		border-style: solid;
		background: #f0fff4;
	}

	.upload-card h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #495057;
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.upload-button {
		display: inline-block;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #0066cc;
		background-color: #ffffff;
		border: 2px solid #0066cc;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: 1rem;
	}

	.upload-button:hover {
		background-color: #0066cc;
		color: #ffffff;
	}

	.upload-button:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
	}

	.upload-status {
		font-size: 0.875rem;
		color: #6c757d;
		min-height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 0.25rem;
	}

	.upload-status.loaded {
		color: #155724;
	}

	.success-icon {
		color: #28a745;
		font-size: 1.25rem;
		font-weight: bold;
	}

	.report-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.report-meta {
		font-size: 0.75rem;
		color: #6c757d;
	}

	.placeholder {
		font-style: italic;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.btn-primary,
	.btn-secondary {
		display: inline-block;
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

	.btn-primary:hover:not(:disabled) {
		background-color: #0052a3;
	}

	.btn-primary:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
	}

	.btn-primary:disabled {
		background-color: #a0c4e8;
		cursor: not-allowed;
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

	@media (max-width: 600px) {
		.upload-section {
			grid-template-columns: 1fr;
		}

		.modal {
			padding: 1.5rem;
			margin: 0.5rem;
		}
	}

	@media (prefers-color-scheme: dark) {
		.modal {
			background: #2d2d2d;
			color: #e9ecef;
		}

		.modal h2 {
			color: #e9ecef;
		}

		.description {
			color: #adb5bd;
		}

		.form-group label {
			color: #e9ecef;
		}

		.form-group input[type='text'] {
			background-color: #1a1a1a;
			color: #e9ecef;
			border-color: #495057;
		}

		.upload-card {
			background: #1a1a1a;
			border-color: #495057;
		}

		.upload-card:has(.loaded) {
			background: #1a2f1a;
			border-color: #28a745;
		}

		.upload-card h3 {
			color: #adb5bd;
		}

		.upload-button {
			background-color: #2d2d2d;
			color: #66b3ff;
			border-color: #66b3ff;
		}

		.upload-button:hover {
			background-color: #0066cc;
			color: #ffffff;
		}

		.error-message {
			background-color: #3d1f1f;
			color: #f5c6cb;
			border-color: #5a2020;
		}
	}
</style>
