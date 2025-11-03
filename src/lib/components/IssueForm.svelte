<script lang="ts">
	import { onMount } from 'svelte';
	import { t, currentLanguage } from '../i18n';
	import { wcagCriteria } from '../wcag-criteria';
	import { ScreenshotService } from '../services/screenshot';
	import type { Priority } from '../types';
	import { formatWCAGOption } from '../utils/wcag';
	import Announcer from './Announcer.svelte';

	interface IssueFormData {
		page: string;
		criterionNumber: string;
		title: string;
		description: string;
		location: string;
		screenshot?: string;
		notes: string;
		priority: Priority;
	}

	let {
		pages,
		onSubmit,
		onCancel,
		initialData
	}: {
		pages: string[];
		onSubmit: (data: IssueFormData) => void;
		onCancel: () => void;
		initialData?: IssueFormData;
	} = $props();

	let formData = $state<IssueFormData>({
		page: initialData?.page || '',
		criterionNumber: initialData?.criterionNumber || '',
		title: initialData?.title || '',
		description: initialData?.description || '',
		location: initialData?.location || '',
		screenshot: initialData?.screenshot,
		notes: initialData?.notes || '',
		priority: initialData?.priority || 2
	});

	let showNewPageField = $state(false);
	let newPageName = $state('');
	let announcement = $state('');
	let screenshotInput: HTMLInputElement;
	let pageSelect: HTMLSelectElement;
	let errors = $state<Record<string, string>>({});

	onMount(() => {
		pageSelect?.focus();
	});

	const wcagOptions = $derived(
		wcagCriteria.map((c) => ({
			value: c.number,
			label: formatWCAGOption(c, $currentLanguage)
		}))
	);

	function handlePageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		if (target.value === '__new__') {
			showNewPageField = true;
			announcement = $t('newPageFieldShown');
			setTimeout(() => {
				announcement = '';
			}, 1000);
		} else {
			showNewPageField = false;
			formData.page = target.value;
		}
	}

	function handleNewPageNameChange(e: Event) {
		const target = e.target as HTMLInputElement;
		newPageName = target.value;
		formData.page = target.value;
	}

	async function handleScreenshotChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			try {
				formData.screenshot = await ScreenshotService.processScreenshot(file);
				errors.screenshot = '';
			} catch (error) {
				errors.screenshot = (error as Error).message;
			}
		}
	}

	function removeScreenshot() {
		formData.screenshot = undefined;
		if (screenshotInput) {
			screenshotInput.value = '';
		}
	}

	function validate(): boolean {
		errors = {};
		if (!formData.page) errors.page = $t('required');
		if (!formData.criterionNumber) errors.criterionNumber = $t('required');
		if (!formData.title) errors.title = $t('required');
		if (!formData.description) errors.description = $t('required');
		if (!formData.location) errors.location = $t('required');
		if (!formData.notes) errors.notes = $t('required');
		if (!formData.priority) errors.priority = $t('required');

		return Object.keys(errors).length === 0;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (validate()) {
			onSubmit(formData);
		}
	}
</script>

<Announcer bind:message={announcement} />

<form onsubmit={handleSubmit} class="issue-form">
	<div class="form-group">
		<label for="page">
			{$t('page')} <span class="required-indicator">({$t('required')})</span>
		</label>
		<select
			id="page"
			bind:this={pageSelect}
			onchange={handlePageChange}
			value={showNewPageField ? '__new__' : formData.page}
			aria-required="true"
			aria-invalid={!!errors.page}
			aria-describedby={errors.page ? 'page-error' : undefined}
		>
			<option value="">{$t('selectPage')}</option>
			{#each pages as page}
				<option value={page}>{page}</option>
			{/each}
			<option value="__new__">{$t('addNewPage')}</option>
		</select>
		{#if errors.page}
			<div id="page-error" class="error" role="alert">{errors.page}</div>
		{/if}
	</div>

	{#if showNewPageField}
		<div class="form-group">
			<label for="newPage">
				{$t('newPageName')} <span class="required-indicator">({$t('required')})</span>
			</label>
			<input
				type="text"
				id="newPage"
				bind:value={newPageName}
				oninput={handleNewPageNameChange}
				aria-required="true"
			/>
		</div>
	{/if}

	<div class="form-group">
		<label for="criterion">
			{$t('wcagCriterion')} <span class="required-indicator">({$t('required')})</span>
		</label>
		<select
			id="criterion"
			bind:value={formData.criterionNumber}
			aria-required="true"
			aria-invalid={!!errors.criterionNumber}
			aria-describedby={errors.criterionNumber ? 'criterion-error' : undefined}
		>
			<option value="">{$t('selectCriterion')}</option>
			{#each wcagOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		{#if errors.criterionNumber}
			<div id="criterion-error" class="error" role="alert">{errors.criterionNumber}</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="priority">
			{$t('priority')} <span class="required-indicator">({$t('required')})</span>
		</label>
		<select
			id="priority"
			bind:value={formData.priority}
			aria-required="true"
			aria-invalid={!!errors.priority}
			aria-describedby={errors.priority ? 'priority-error' : undefined}
		>
			<option value="">{$t('selectPriority')}</option>
			<option value={1}>{$t('priorityLow')}</option>
			<option value={2}>{$t('priorityMedium')}</option>
			<option value={3}>{$t('priorityBlocker')}</option>
		</select>
		{#if errors.priority}
			<div id="priority-error" class="error" role="alert">{errors.priority}</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="title">
			{$t('issueTitle')} <span class="required-indicator">({$t('required')})</span>
		</label>
		<input
			type="text"
			id="title"
			bind:value={formData.title}
			aria-required="true"
			aria-invalid={!!errors.title}
			aria-describedby={errors.title ? 'title-error' : undefined}
		/>
		{#if errors.title}
			<div id="title-error" class="error" role="alert">{errors.title}</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="description">
			{$t('issueDescription')} <span class="required-indicator">({$t('required')})</span>
		</label>
		<textarea
			id="description"
			bind:value={formData.description}
			rows="4"
			aria-required="true"
			aria-invalid={!!errors.description}
			aria-describedby={errors.description ? 'description-error' : undefined}
		></textarea>
		{#if errors.description}
			<div id="description-error" class="error" role="alert">{errors.description}</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="location">
			{$t('issueLocation')} <span class="required-indicator">({$t('required')})</span>
		</label>
		<textarea
			id="location"
			bind:value={formData.location}
			rows="3"
			aria-required="true"
			aria-invalid={!!errors.location}
			aria-describedby={errors.location ? 'location-error' : undefined}
		></textarea>
		{#if errors.location}
			<div id="location-error" class="error" role="alert">{errors.location}</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="screenshot">
			{$t('screenshot')} <span class="optional-indicator">({$t('optional')})</span>
		</label>
		<input
			type="file"
			id="screenshot"
			accept="image/*"
			onchange={handleScreenshotChange}
			bind:this={screenshotInput}
			aria-describedby="screenshot-help"
		/>
		<div id="screenshot-help" class="help-text">{$t('issueLocation')}</div>
		{#if formData.screenshot}
			<div class="screenshot-preview">
				<img src={formData.screenshot} alt={formData.location} />
				<button type="button" onclick={removeScreenshot} class="btn-secondary">
					{$t('removeScreenshot')}
				</button>
			</div>
		{/if}
		{#if errors.screenshot}
			<div class="error" role="alert">{errors.screenshot}</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="notes">
			{$t('notesAndSolutions')} <span class="required-indicator">({$t('required')})</span>
		</label>
		<textarea
			id="notes"
			bind:value={formData.notes}
			rows="4"
			aria-required="true"
			aria-invalid={!!errors.notes}
			aria-describedby={errors.notes ? 'notes-error' : undefined}
		></textarea>
		{#if errors.notes}
			<div id="notes-error" class="error" role="alert">{errors.notes}</div>
		{/if}
	</div>

	<div class="form-actions">
		<button type="submit" class="btn-primary">{$t('save')}</button>
		<button type="button" onclick={onCancel} class="btn-secondary">{$t('cancel')}</button>
	</div>
</form>

<style>
	.issue-form {
		background: #ffffff;
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid #dee2e6;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #212529;
	}

	.required-indicator {
		color: #dc3545;
		font-weight: normal;
		font-size: 0.875rem;
	}

	.optional-indicator {
		color: #6c757d;
		font-weight: normal;
		font-size: 0.875rem;
	}

	input[type='text'],
	select,
	textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		line-height: 1.5;
		color: #212529;
		background-color: #fff;
		border: 2px solid #ced4da;
		border-radius: 4px;
		font-family: inherit;
	}

	input[type='text']:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	input[type='file'] {
		padding: 0.5rem 0;
	}

	textarea {
		resize: vertical;
	}

	.error {
		color: #dc3545;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.help-text {
		color: #6c757d;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.screenshot-preview {
		margin-top: 1rem;
		padding: 1rem;
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 4px;
	}

	.screenshot-preview img {
		max-width: 100%;
		height: auto;
		display: block;
		margin-bottom: 0.75rem;
		border: 1px solid #dee2e6;
		border-radius: 4px;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #dee2e6;
	}

	.btn-primary,
	.btn-secondary {
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

	input[aria-invalid='true'],
	select[aria-invalid='true'],
	textarea[aria-invalid='true'] {
		border-color: #dc3545;
	}
</style>
