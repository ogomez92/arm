<script lang="ts">
	import type { Issue } from '../types';
	import { t, currentLanguage } from '../i18n';
	import { wcagCriteria } from '../wcag-criteria';
	import { ClipboardService } from '../services/clipboard';
	import { getPriorityLabel } from '../utils/priority';
	import { getWCAGCriterionTitle } from '../utils/wcag';

	type SortBy = 'page' | 'criteria' | 'priority';

	let {
		issues,
		onEdit,
		onDelete,
		onCopy,
		onSortChange,
		onCreateJiraTicket,
		initialSortBy = 'priority'
	}: {
		issues: Issue[];
		onEdit: (issue: Issue) => void;
		onDelete: (issueId: string) => void;
		onCopy: () => void;
		onSortChange?: (sortBy: SortBy) => void;
		onCreateJiraTicket?: (issue: Issue) => void;
		initialSortBy?: SortBy;
	} = $props();

	// Track which issue's Jira button is expanded (for aria-expanded)
	let expandedJiraIssueId = $state<string | null>(null);

	let sortBy = $state<SortBy>(initialSortBy);
	let showOnlyNeedsReview = $state(false);

	const sortedIssues = $derived.by(() => {
		let issuesCopy = [...issues];

		// Apply needs review filter
		if (showOnlyNeedsReview) {
			issuesCopy = issuesCopy.filter((issue) => issue.needsReview);
		}

		switch (sortBy) {
			case 'page':
				return issuesCopy.sort((a, b) => a.page.localeCompare(b.page));
			case 'criteria':
				return issuesCopy.sort((a, b) => a.criterionNumber.localeCompare(b.criterionNumber));
			case 'priority':
			default:
				return issuesCopy.sort((a, b) => b.priority - a.priority);
		}
	});

	function handleSortChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		sortBy = target.value as SortBy;
		onSortChange?.(sortBy);
	}

	async function handleCopy(issue: Issue) {
		try {
			await ClipboardService.copyIssue(issue, $currentLanguage);
			onCopy();
		} catch (error) {
			console.error('Failed to copy issue:', error);
		}
	}

	function handleDelete(issueId: string) {
		if (confirm($t('confirmDelete'))) {
			onDelete(issueId);
		}
	}

	function getCriterion(number: string) {
		return wcagCriteria.find((c) => c.number === number);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString($currentLanguage);
	}

	function handleJiraClick(issue: Issue) {
		expandedJiraIssueId = issue.id;
		onCreateJiraTicket?.(issue);
	}
</script>

{#if issues.length === 0}
	<div class="no-issues">
		<p>{$t('noIssues')}</p>
	</div>
{:else}
	<div class="table-controls">
		<div class="sort-controls">
			<label for="sortBy">{$t('sortBy')}:</label>
			<select id="sortBy" bind:value={sortBy} onchange={handleSortChange}>
				<option value="priority">{$t('sortByPriority')}</option>
				<option value="page">{$t('sortByPage')}</option>
				<option value="criteria">{$t('sortByCriteria')}</option>
			</select>
		</div>
		<div class="filter-controls">
			<label class="filter-checkbox">
				<input
					type="checkbox"
					bind:checked={showOnlyNeedsReview}
				/>
				{$t('showOnlyNeedsReview')}
			</label>
		</div>
	</div>
	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th scope="col">{$t('priority')}</th>
					<th scope="col">{$t('page')}</th>
					<th scope="col">{$t('wcagCriterion')}</th>
					<th scope="col">{$t('issueTitle')}</th>
					<th scope="col">{$t('issueLocation')}</th>
					<th scope="col">{$t('jira')}</th>
					<th scope="col">{$t('actions')}</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedIssues as issue (issue.id)}
					{@const criterion = getCriterion(issue.criterionNumber)}
					<tr>
						<td data-label={$t('priority')}>
							<span class="priority priority-{issue.priority}">
								{getPriorityLabel(issue.priority, $currentLanguage)}
							</span>
						</td>
						<td data-label={$t('page')}>{issue.page}</td>
						<td data-label={$t('wcagCriterion')}>
							{#if criterion}
								<div class="criterion-cell">
									<strong>{criterion.number}</strong>
									<span class="criterion-title">{getWCAGCriterionTitle(criterion.number, $currentLanguage)}</span>
									<span class="criterion-level level-{criterion.level.toLowerCase()}"
										>{criterion.level}</span
									>
								</div>
							{:else}
								{issue.criterionNumber}
							{/if}
						</td>
						<td data-label={$t('issueTitle')}>
							<div class="issue-title-cell" class:needs-review={issue.needsReview}>
								<strong
									aria-label={issue.needsReview ? `${$t('needsReviewPrefix')} ${issue.title}` : issue.title}
								>{issue.title}</strong>
								<p class="description">{issue.description}</p>
								{#if issue.screenshot}
									<span class="has-screenshot" aria-hidden="true">📷</span>
								{/if}
							</div>
						</td>
						<td data-label={$t('issueLocation')}>{issue.location}</td>
						<td data-label={$t('jira')}>
							{#if issue.jiraTicketUrl && issue.jiraTicketKey}
								<a
									href={issue.jiraTicketUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="jira-link"
									title={`${$t('jiraViewTicket')}: ${issue.jiraTicketKey}`}
								>
									{issue.jiraTicketKey}
								</a>
							{:else if onCreateJiraTicket}
								<button
									type="button"
									onclick={() => handleJiraClick(issue)}
									class="btn-jira"
									aria-haspopup="dialog"
									aria-expanded={expandedJiraIssueId === issue.id}
									aria-label={`${$t('createJiraTicket')}: ${issue.title}`}
									title={$t('createJiraTicket')}
								>
									{$t('jiraNoTicket')}
								</button>
							{:else}
								<span class="no-jira">{$t('jiraNoTicket')}</span>
							{/if}
						</td>
						<td data-label={$t('actions')}>
							<div class="action-buttons">
								<button
									type="button"
									onclick={() => handleCopy(issue)}
									class="btn-icon"
									aria-label={`${$t('copyIssue')}: ${issue.title}`}
									title={`${$t('copyIssue')}: ${issue.title}`}
								>
									📋
								</button>
								<button
									type="button"
									onclick={() => onEdit(issue)}
									class="btn-icon"
									aria-label={`${$t('edit')}: ${issue.title}`}
									title={`${$t('edit')}: ${issue.title}`}
								>
									✏️
								</button>
								<button
									type="button"
									onclick={() => handleDelete(issue.id)}
									class="btn-icon btn-danger"
									aria-label={`${$t('delete')}: ${issue.title}`}
									title={`${$t('delete')}: ${issue.title}`}
								>
									🗑️
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.no-issues {
		text-align: center;
		padding: 3rem 1rem;
		color: #6c757d;
		font-size: 1.125rem;
	}

	.table-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sort-controls label {
		font-weight: 500;
	}

	.sort-controls select {
		padding: 0.5rem 0.75rem;
		border: 2px solid #ced4da;
		border-radius: 4px;
		font-size: 1rem;
		min-width: 150px;
		background-color: #ffffff;
		cursor: pointer;
	}

	.sort-controls select:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.filter-controls {
		display: flex;
		align-items: center;
	}

	.filter-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: 500;
	}

	.filter-checkbox input[type='checkbox'] {
		width: 1.125rem;
		height: 1.125rem;
		cursor: pointer;
		accent-color: #0066cc;
	}

	.table-container {
		overflow-x: auto;
		border: 1px solid #dee2e6;
		border-radius: 8px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: #ffffff;
	}

	thead {
		background-color: #f8f9fa;
		border-bottom: 2px solid #dee2e6;
	}

	th {
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		color: #212529;
		border-bottom: 2px solid #dee2e6;
	}

	td {
		padding: 1rem;
		border-bottom: 1px solid #dee2e6;
		vertical-align: top;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background-color: #f8f9fa;
	}

	.criterion-cell {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.criterion-title {
		font-size: 0.875rem;
		color: #6c757d;
	}

	.criterion-level {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 12px;
		width: fit-content;
	}

	.level-a {
		background-color: #d1ecf1;
		color: #0c5460;
	}

	.level-aa {
		background-color: #fff3cd;
		color: #856404;
	}

	.level-aaa {
		background-color: #f8d7da;
		color: #721c24;
	}

	.priority {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 12px;
		width: fit-content;
	}

	.priority-1 {
		background-color: #d1ecf1;
		color: #0c5460;
	}

	.priority-2 {
		background-color: #fff3cd;
		color: #856404;
	}

	.priority-3 {
		background-color: #f8d7da;
		color: #721c24;
	}

	.issue-title-cell {
		position: relative;
	}

	.issue-title-cell.needs-review strong {
		font-weight: 700;
		text-decoration: underline;
	}

	.description {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #6c757d;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.has-screenshot {
		margin-left: 0.5rem;
		font-size: 1rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-icon {
		padding: 0.5rem;
		font-size: 1.25rem;
		border: 2px solid #ced4da;
		border-radius: 4px;
		background: #ffffff;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 2.5rem;
		min-height: 2.5rem;
	}

	.btn-icon:hover {
		background-color: #f8f9fa;
		border-color: #0066cc;
	}

	.btn-icon:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.btn-danger:hover {
		background-color: #fff5f5;
		border-color: #dc3545;
	}

	.btn-danger:focus {
		border-color: #dc3545;
		box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
	}

	.jira-link {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background-color: #0052cc;
		color: #ffffff;
		text-decoration: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.jira-link:hover {
		background-color: #0747a6;
	}

	.jira-link:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.25);
	}

	.btn-jira {
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 2px dashed #ced4da;
		border-radius: 4px;
		background: #ffffff;
		color: #6c757d;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-jira:hover {
		border-color: #0052cc;
		color: #0052cc;
		background-color: #f0f7ff;
	}

	.btn-jira:focus {
		outline: none;
		border-color: #0052cc;
		box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.25);
	}

	.no-jira {
		color: #6c757d;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		table,
		thead,
		tbody,
		th,
		td,
		tr {
			display: block;
		}

		thead tr {
			position: absolute;
			top: -9999px;
			left: -9999px;
		}

		tr {
			margin-bottom: 1rem;
			border: 1px solid #dee2e6;
			border-radius: 4px;
		}

		td {
			border: none;
			border-bottom: 1px solid #dee2e6;
			position: relative;
			padding-left: 50%;
		}

		td:last-child {
			border-bottom: none;
		}

		td:before {
			content: attr(data-label);
			position: absolute;
			left: 1rem;
			width: 45%;
			padding-right: 10px;
			white-space: nowrap;
			font-weight: 600;
		}

		.action-buttons {
			justify-content: flex-end;
		}
	}
</style>
