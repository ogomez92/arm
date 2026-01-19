<script lang="ts">
	import { onMount } from 'svelte';
	import { t, currentLanguage, setLanguage } from './lib/i18n';
	import type { Report, Issue } from './lib/types';
	import { ReportStorage } from './lib/services/storage';
	import { HTMLExport } from './lib/services/html-export';
	import { generateWeeklyReport, generateCriteriaSummaries, type WeeklyReportTranslations, type CriteriaSummariesTranslations } from './lib/services/weekly-report';
	import { IndexedDBStorage, type SortBy } from './lib/services/indexdb-storage';
	import type { AxeScanMessage } from './lib/services/axe-snippet';
	import IssuesTable from './lib/components/IssuesTable.svelte';
	import IssueForm from './lib/components/IssueForm.svelte';
	import Announcer from './lib/components/Announcer.svelte';
	import ExportDropdown from './lib/components/ExportDropdown.svelte';
	import AxeScanDialog from './lib/components/AxeScanDialog.svelte';
	import AxeResultsPage from './lib/components/AxeResultsPage.svelte';
	import JiraConfigModal from './lib/components/JiraConfigModal.svelte';
	import JiraCreateModal from './lib/components/JiraCreateModal.svelte';
	import MergeReportsModal from './lib/components/MergeReportsModal.svelte';
	import type { JiraConfig } from './lib/types';

	let report = $state<Report | null>(null);
	let selectedPage = $state<string>('__all__');
	let showAddForm = $state(false);
	let editingIssue = $state<Issue | null>(null);
	let duplicatingIssueData = $state<{
		page: string;
		criterionNumber: string;
		title: string;
		description: string;
		location: string;
		notes: string;
		priority: number;
		needsReview?: boolean;
	} | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();
	let reportNameInput: HTMLInputElement | undefined = $state();
	let addIssueButton: HTMLButtonElement | undefined = $state();
	let announcement = $state('');
	let showCreateDialog = $state(false);
	let newReportName = $state('');
	let modalTriggerElement: HTMLElement | null = null;
	let issueFormTriggerElement: HTMLElement | null = null;
	let previousFilteredCount = $state<number | null>(null);
	let sortBy = $state<SortBy>('priority');
	let hasLoadedInitially = $state(false);
	let showAxeScanDialog = $state(false);
	let axeScanData = $state<AxeScanMessage | null>(null);
	let axeScanTriggerElement: HTMLElement | null = null;
	let showWeeklyReportDialog = $state(false);
	let weeklyReportStartDate = $state('');
	let weeklyReportTriggerElement: HTMLElement | null = null;
	let startDateInput: HTMLInputElement | undefined = $state();

	// Jira integration state
	let showJiraConfigModal = $state(false);
	let showJiraCreateModal = $state(false);
	let jiraIssueToCreate = $state<Issue | null>(null);
	let jiraTriggerElement: HTMLElement | null = null;
	let pendingJiraAction = $state(false); // Whether we should open create modal after config

	// Merge reports state
	let showMergeReportsModal = $state(false);
	let mergeReportsTriggerElement: HTMLElement | null = null;

	const filteredIssues = $derived(
		report
			? selectedPage === '__all__'
				? [...report.issues]
				: report.issues.filter((issue) => issue.page === selectedPage)
			: []
	);

	// Load saved report from IndexedDB on mount and migrate from localStorage if needed
	onMount(async () => {
		console.log('=== onMount started ===');
		console.log('Initial report state:', report);
		console.log('Initial hasLoadedInitially:', hasLoadedInitially);

		try {
			// First, try to migrate from localStorage
			console.log('Starting migration check...');
			await IndexedDBStorage.migrateFromLocalStorage();
			console.log('Migration check completed');

			// Then load from IndexedDB
			console.log('Loading report from IndexedDB...');
			const saved = await IndexedDBStorage.loadCurrentReport();
			console.log('Load result:', saved ? `Found report: ${saved.name}` : 'No report found');

			if (saved) {
				console.log('Setting report state...');
				report = saved;
				console.log('Report state set successfully');
			}

			const savedSort = await IndexedDBStorage.loadSortPreference();
			if (savedSort) {
				sortBy = savedSort;
			}
		} catch (error) {
			console.error('Failed to load saved report:', error);
		} finally {
			// Mark that we've completed the initial load
			console.log('Setting hasLoadedInitially to true');
			hasLoadedInitially = true;
			console.log('=== onMount completed ===');
		}

		// Listen for axe scan results from console snippet via BroadcastChannel
		const channel = new BroadcastChannel('axe-scan-results');

		const handleAxeMessage = (event: MessageEvent) => {
			// Check if this is an axe scan result message
			if (event.data?.type === 'AXE_SCAN_RESULTS') {
				console.log('Received axe scan results via BroadcastChannel');
				axeScanData = event.data as AxeScanMessage;
			}
		};

		channel.addEventListener('message', handleAxeMessage);

		// Cleanup
		return () => {
			channel.close();
		};
	});

	// Auto-save report to IndexedDB whenever it changes
	$effect(() => {
		// Don't run until after initial load to avoid deleting the report during mount
		if (!hasLoadedInitially) {
			return;
		}

		if (report) {
			console.log('$effect triggered - saving report to IndexedDB:', report.name);
			IndexedDBStorage.saveCurrentReport(report)
				.then(() => {
					console.log('Report auto-save completed successfully');
				})
				.catch((error) => {
					console.error('Failed to save report:', error);
				});
		} else {
			console.log('$effect triggered - report is null, deleting from IndexedDB');
			IndexedDBStorage.deleteCurrentReport().catch((error) => {
				console.error('Failed to delete report:', error);
			});
		}
	});

	// Update page title when report changes
	$effect(() => {
		if (report) {
			document.title = `${report.name} - ${$t('appTitle')}`;
		} else {
			document.title = $t('appTitle');
		}
	});

	// Announce filtered issues count
	$effect(() => {
		if (report && selectedPage !== undefined) {
			const count = filteredIssues.length;

			// Only announce if count changed
			if (previousFilteredCount !== null && previousFilteredCount !== count) {
				const message = count === 0
					? $t('showingNoIssues')
					: $t('showingIssues').replace('{count}', count.toString());

				announcement = message;
				setTimeout(() => {
					announcement = '';
				}, 3000);
			}

			previousFilteredCount = count;
		}
	});

	function handleLanguageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		setLanguage(target.value as 'en' | 'es');
	}

	async function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			try {
				const loadedReport = await ReportStorage.loadReportFromFile(file);
				report = loadedReport;
				selectedPage = '__all__';
				showAddForm = false;
				editingIssue = null;

				// Reset file input
				target.value = '';

				// Focus the Add New Issue button after uploading report
				setTimeout(() => {
					addIssueButton?.focus();
				}, 100);
			} catch (error) {
				console.error('Error loading report:', error);
				alert($t('errorLoadingReport') + ': ' + (error as Error).message);
			}
		}
	}

	function showCreateNewDialog(e: Event) {
		modalTriggerElement = e.target as HTMLElement;
		showCreateDialog = true;
		newReportName = '';
		setTimeout(() => {
			reportNameInput?.focus();
		}, 0);
	}

	function handleCreateReport() {
		if (newReportName.trim()) {
			report = ReportStorage.createNewReport(newReportName.trim());
			showCreateDialog = false;
			newReportName = '';
			selectedPage = '__all__';
			showAddForm = false;
			editingIssue = null;

			// Focus the Add New Issue button after creating report
			setTimeout(() => {
				addIssueButton?.focus();
			}, 100);
		}
	}

	function cancelCreateReport() {
		showCreateDialog = false;
		newReportName = '';
		returnFocusToTrigger();
	}

	function returnFocusToTrigger() {
		setTimeout(() => {
			modalTriggerElement?.focus();
			modalTriggerElement = null;
		}, 0);
	}

	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			cancelCreateReport();
		}
	}

	function handleAddIssue(e: Event) {
		issueFormTriggerElement = e.target as HTMLElement;
		showAddForm = true;
		editingIssue = null;
	}

	function handleEditIssue(issue: Issue, e?: Event) {
		if (e) {
			issueFormTriggerElement = e.target as HTMLElement;
		}
		editingIssue = issue;
		showAddForm = true;
	}

	function handleDuplicateIssue(issue: Issue, e?: Event) {
		if (e) {
			issueFormTriggerElement = e.target as HTMLElement;
		}
		// Set duplicating data excluding screenshot (will create new issue with new ID)
		duplicatingIssueData = {
			page: issue.page,
			criterionNumber: issue.criterionNumber,
			title: issue.title,
			description: issue.description,
			location: issue.location,
			notes: issue.notes,
			priority: issue.priority,
			needsReview: issue.needsReview
		};
		editingIssue = null;
		showAddForm = true;
	}

	function handleSubmitIssue(data: {
		page: string;
		criterionNumber: string;
		title: string;
		description: string;
		location: string;
		screenshot?: string;
		notes: string;
		priority: number;
	}) {
		if (!report) return;

		try {
			if (editingIssue) {
				report = ReportStorage.updateIssue(report, editingIssue.id, data);
			} else {
				report = ReportStorage.addIssue(report, data);
			}
			showAddForm = false;
			editingIssue = null;
			duplicatingIssueData = null;
			returnIssueFormFocus();
		} catch (error) {
			alert($t('errorSavingIssue') + ': ' + (error as Error).message);
		}
	}

	function handleCancelForm() {
		showAddForm = false;
		editingIssue = null;
		duplicatingIssueData = null;
		returnIssueFormFocus();
	}

	function returnIssueFormFocus() {
		setTimeout(() => {
			issueFormTriggerElement?.focus();
			issueFormTriggerElement = null;
		}, 0);
	}

	function handleIssueFormKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancelForm();
		}
	}

	function handleDeleteIssue(issueId: string) {
		if (!report) return;

		try {
			report = ReportStorage.deleteIssue(report, issueId);
		} catch (error) {
			alert($t('errorDeletingIssue') + ': ' + (error as Error).message);
		}
	}

	function handleCopySuccess() {
		announcement = $t('issuesCopied');
		setTimeout(() => {
			announcement = '';
		}, 3000);
	}

	function handleSortChange(newSortBy: SortBy) {
		sortBy = newSortBy;
		IndexedDBStorage.saveSortPreference(sortBy).catch((error) => {
			console.error('Failed to save sort preference:', error);
		});
	}

	function downloadJSON() {
		if (report) {
			ReportStorage.downloadReport(report);
		}
	}

	function downloadHTML() {
		if (report) {
			HTMLExport.downloadHTML(report, $currentLanguage, sortBy);
		}
	}

	const exportMenuItems = $derived([
		{
			id: 'download-json',
			label: $t('downloadJSON'),
			onClick: downloadJSON
		},
		{
			id: 'download-html',
			label: $t('downloadHTML'),
			onClick: downloadHTML
		}
	]);

	function showWeeklyReportModal(e: Event) {
		weeklyReportTriggerElement = e.target as HTMLElement;
		showWeeklyReportDialog = true;
		// Set default date to 7 days ago
		const defaultDate = new Date();
		defaultDate.setDate(defaultDate.getDate() - 7);
		weeklyReportStartDate = defaultDate.toISOString().split('T')[0];
		setTimeout(() => {
			startDateInput?.focus();
		}, 0);
	}

	function cancelWeeklyReport() {
		showWeeklyReportDialog = false;
		weeklyReportStartDate = '';
		returnWeeklyReportFocus();
	}

	function returnWeeklyReportFocus() {
		setTimeout(() => {
			weeklyReportTriggerElement?.focus();
			weeklyReportTriggerElement = null;
		}, 0);
	}

	function handleWeeklyReportKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			cancelWeeklyReport();
		}
	}

	async function generateAndCopyWeeklyReport() {
		if (!report || !weeklyReportStartDate) return;

		try {
			const translations: WeeklyReportTranslations = {
				weeklyReport: $t('weeklyReport'),
				since: $t('since'),
				totalIssuesFound: $t('totalIssuesFound'),
				followingCriteria: $t('followingCriteria'),
				noIssuesFound: $t('noIssuesFound'),
				ofWhich: $t('ofWhich'),
				areBlocker: $t('areBlocker'),
				areMedium: $t('areMedium'),
				areLow: $t('areLow')
			};

			const startDate = new Date(weeklyReportStartDate);
			const markdown = generateWeeklyReport(report, startDate, translations, $currentLanguage);
			await navigator.clipboard.writeText(markdown);

			showWeeklyReportDialog = false;
			weeklyReportStartDate = '';

			announcement = $t('weeklyReportCopied');
			setTimeout(() => {
				announcement = '';
			}, 3000);

			returnWeeklyReportFocus();
		} catch (error) {
			console.error('Failed to copy weekly report:', error);
			alert($t('error') + ': ' + (error as Error).message);
		}
	}

	async function copyCriteriaSummaries() {
		if (!report) return;

		try {
			const translations: CriteriaSummariesTranslations = {
				inThe: $t('inThe'),
				pageWord: $t('pageWord')
			};

			const summaries = generateCriteriaSummaries(report, translations, $currentLanguage);
			await navigator.clipboard.writeText(summaries);

			announcement = $t('criteriaSummariesCopied');
			setTimeout(() => {
				announcement = '';
			}, 3000);
		} catch (error) {
			console.error('Failed to copy criteria summaries:', error);
			alert($t('error') + ': ' + (error as Error).message);
		}
	}

	function handleOpenAxeScan(e: Event) {
		axeScanTriggerElement = e.target as HTMLElement;
		showAxeScanDialog = true;
	}

	function handleCloseAxeScan() {
		showAxeScanDialog = false;
		returnAxeScanFocus();
	}

	function returnAxeScanFocus() {
		setTimeout(() => {
			axeScanTriggerElement?.focus();
			axeScanTriggerElement = null;
		}, 0);
	}

	function handleSaveAxeResults(issues: any[]) {
		if (!report) {
			// Create a new report if none exists
			const newReportName = axeScanData?.pageTitle || 'Axe Scan Report';
			report = ReportStorage.createNewReport(newReportName);
		}

		// Add each issue to the report
		issues.forEach((axeIssue) => {
			if (report) {
				report = ReportStorage.addIssue(report, {
					page: axeIssue.pageTitle,
					criterionNumber: axeIssue.criterionNumber,
					title: axeIssue.title,
					description: axeIssue.description,
					location: axeIssue.location,
					screenshot: axeIssue.screenshot,
					notes: axeIssue.notes,
					priority: axeIssue.priority
				});
			}
		});

		// Clear axe scan data and show success message
		axeScanData = null;
		announcement = `${issues.length} issues added to report`;
		setTimeout(() => {
			announcement = '';
		}, 3000);
	}

	function handleCancelAxeResults() {
		axeScanData = null;
	}

	function handleImportAxeResults(data: AxeScanMessage) {
		console.log('Importing axe scan results:', data);
		axeScanData = data;
		showAxeScanDialog = false;
	}

	// Jira integration handlers
	function handleCreateJiraTicket(issue: Issue) {
		jiraIssueToCreate = issue;

		// Check if Jira is configured
		if (!report?.jiraConfig?.baseUrl || !report?.jiraConfig?.apiToken || !report?.jiraConfig?.userEmail) {
			// Need to configure Jira first
			pendingJiraAction = true;
			showJiraConfigModal = true;
		} else {
			// Jira is configured, show create modal
			showJiraCreateModal = true;
		}
	}

	function handleJiraConfigSave(config: JiraConfig) {
		if (report) {
			report = {
				...report,
				jiraConfig: config,
				updatedAt: new Date().toISOString()
			};
			announcement = $t('jiraConfigSaved');
			setTimeout(() => {
				announcement = '';
			}, 3000);
		}

		showJiraConfigModal = false;

		// If there was a pending action, open the create modal
		if (pendingJiraAction && jiraIssueToCreate) {
			pendingJiraAction = false;
			showJiraCreateModal = true;
		}
	}

	function handleJiraConfigCancel() {
		showJiraConfigModal = false;
		pendingJiraAction = false;
		jiraIssueToCreate = null;
		returnJiraFocus();
	}

	function handleJiraCreateSuccess(ticketUrl: string, ticketKey: string) {
		if (report && jiraIssueToCreate) {
			// Update the issue with the Jira ticket info
			const updatedIssues = report.issues.map((issue) =>
				issue.id === jiraIssueToCreate!.id
					? {
							...issue,
							jiraTicketUrl: ticketUrl,
							jiraTicketKey: ticketKey,
							updatedAt: new Date().toISOString()
						}
					: issue
			);

			report = {
				...report,
				issues: updatedIssues,
				updatedAt: new Date().toISOString()
			};

			announcement = $t('jiraTicketCreatedWithKey').replace('{key}', ticketKey);
			setTimeout(() => {
				announcement = '';
			}, 3000);
		}

		showJiraCreateModal = false;
		jiraIssueToCreate = null;
		returnJiraFocus();
	}

	function handleJiraCreateCancel() {
		showJiraCreateModal = false;
		jiraIssueToCreate = null;
		returnJiraFocus();
	}

	function handleOpenJiraConfig() {
		// Called from the create modal to reconfigure Jira
		showJiraCreateModal = false;
		pendingJiraAction = true;
		showJiraConfigModal = true;
	}

	function returnJiraFocus() {
		setTimeout(() => {
			jiraTriggerElement?.focus();
			jiraTriggerElement = null;
		}, 0);
	}

	// Merge reports handlers
	function handleOpenMergeReports(e: Event) {
		mergeReportsTriggerElement = e.target as HTMLElement;
		showMergeReportsModal = true;
	}

	function handleMergeReportsComplete(mergedReport: Report) {
		report = mergedReport;
		selectedPage = '__all__';
		showMergeReportsModal = false;

		announcement = $t('reportsMerged');
		setTimeout(() => {
			announcement = '';
		}, 3000);

		returnMergeReportsFocus();
	}

	function handleMergeReportsCancel() {
		showMergeReportsModal = false;
		returnMergeReportsFocus();
	}

	function returnMergeReportsFocus() {
		setTimeout(() => {
			mergeReportsTriggerElement?.focus();
			mergeReportsTriggerElement = null;
		}, 0);
	}
</script>

<Announcer bind:message={announcement} />

<div class="app">
	<header>
		<div class="header-content">
			<h1>{$t('appTitle')}</h1>
			<div class="language-selector">
				<label for="language">{$t('language')}:</label>
				<select id="language" value={$currentLanguage} onchange={handleLanguageChange}>
					<option value="en">{$t('english')}</option>
					<option value="es">{$t('spanish')}</option>
				</select>
			</div>
		</div>
	</header>

	<main>
		{#if !report}
			<div class="welcome">
				<h2>{$t('noReportLoaded')}</h2>

				<div class="welcome-actions">
					<button
						type="button"
						onclick={(e) => showCreateNewDialog(e)}
						class="btn-primary"
						aria-haspopup="dialog"
						aria-expanded={showCreateDialog}
					>
						{$t('createNewReport')}
					</button>
					<button
						type="button"
						onclick={(e) => handleOpenAxeScan(e)}
						class="btn-secondary"
						aria-haspopup="dialog"
						aria-expanded={showAxeScanDialog}
					>
						{$t('scanWithAxe')}
					</button>
					<button
						type="button"
						onclick={(e) => handleOpenMergeReports(e)}
						class="btn-secondary"
						aria-haspopup="dialog"
						aria-expanded={showMergeReportsModal}
					>
						{$t('mergeReports')}
					</button>
				</div>

				<div class="onboarding">
					<h3>{$t('aboutThisApp')}</h3>
					<ul>
						<li>{$t('savedLocally')}</li>
						<li>{$t('downloadOptions')}</li>
						<li>{$t('noServerStorage')}</li>
						<li>{$t('weeklyReports')}</li>
						<li>
							{$t('feedbackContact')}
							<a
								href="https://linkedin.com/in/ogomez92"
								target="_blank"
								rel="noopener noreferrer"
							>
								Oriol Gómez Sentís
							</a>
							{$t('onLinkedIn')}
						</li>
					</ul>
				</div>
			</div>
		{:else}
			<div class="report-header">
				<div class="report-info">
					<h2>{report.name}</h2>
					<p class="meta">
						{filteredIssues.length}
						{$t('issuesFound')}
					</p>
				</div>
				<div class="report-actions">
					<button
						type="button"
						onclick={(e) => showCreateNewDialog(e)}
						class="btn-secondary"
						aria-haspopup="dialog"
						aria-expanded={showCreateDialog}
					>
						{$t('createNewReport')}
					</button>
					<button
						type="button"
						onclick={(e) => handleOpenAxeScan(e)}
						class="btn-secondary"
						aria-haspopup="dialog"
						aria-expanded={showAxeScanDialog}
					>
						{$t('scanWithAxe')}
					</button>
					<button
						type="button"
						onclick={(e) => handleOpenMergeReports(e)}
						class="btn-secondary"
						aria-haspopup="dialog"
						aria-expanded={showMergeReportsModal}
					>
						{$t('mergeReports')}
					</button>
					<ExportDropdown buttonLabel={$t('export')} items={exportMenuItems} />
					<button
						type="button"
						onclick={(e) => showWeeklyReportModal(e)}
						class="btn-secondary"
						aria-haspopup="dialog"
						aria-expanded={showWeeklyReportDialog}
					>
						{$t('copyWeeklyReport')}
					</button>
					<button
						type="button"
						onclick={copyCriteriaSummaries}
						class="btn-secondary"
					>
						{$t('copyCriteriaSummaries')}
					</button>
				</div>
			</div>

			<div class="controls">
				<div class="filter-controls">
					<label for="pageFilter">{$t('filterByPage')}:</label>
					<select id="pageFilter" bind:value={selectedPage}>
						<option value="__all__">{$t('allPages')}</option>
						{#each report.pages as page}
							<option value={page}>{page}</option>
						{/each}
					</select>
				</div>

			<button
				type="button"
				bind:this={addIssueButton}
				onclick={(e) => handleAddIssue(e)}
				class="btn-primary"
				aria-haspopup="dialog"
				aria-expanded={showAddForm}
			>
				{$t('addNewIssue')}
			</button>
			</div>


			<section class="issues-section" aria-labelledby="issues-title">
				<h3 id="issues-title" class="sr-only">{$t('issuesFound')}</h3>
				<IssuesTable
					issues={filteredIssues}
					onEdit={handleEditIssue}
					onDelete={handleDeleteIssue}
					onCopy={handleCopySuccess}
					onDuplicate={handleDuplicateIssue}
					onSortChange={handleSortChange}
					onCreateJiraTicket={handleCreateJiraTicket}
					initialSortBy={sortBy}
				/>
			</section>
		{/if}
	</main>
</div>

<label for="fileInput" class="sr-only">{$t('uploadReport')}</label>
<input
	type="file"
	id="fileInput"
	accept=".json"
	bind:this={fileInput}
	onchange={handleFileUpload}
	class="file-input"
/>

{#if showCreateDialog}
	<div
		class="modal-overlay"
		onclick={(e) => {
			if (e.target === e.currentTarget) cancelCreateReport();
		}}
		onkeydown={handleModalKeydown}
		role="dialog"
		aria-labelledby="create-dialog-title"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal">
			<h2 id="create-dialog-title">{$t('createNewReport')}</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateReport();
				}}
			>
				<div class="form-group">
					<label for="reportName">{$t('reportName')}:</label>
					<input
						type="text"
						id="reportName"
						bind:value={newReportName}
						bind:this={reportNameInput}
						placeholder={$t('reportNamePlaceholder')}
						required
					/>
				</div>
				<div class="modal-actions">
					<button type="submit" class="btn-primary">{$t('create')}</button>
					<button type="button" onclick={cancelCreateReport} class="btn-secondary">
						{$t('cancel')}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showAddForm}
	<div
		class="modal-overlay"
		onclick={(e) => {
			if (e.target === e.currentTarget) handleCancelForm();
		}}
		onkeydown={handleIssueFormKeydown}
		role="dialog"
		aria-labelledby="issue-form-title"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal modal-large">
			<h2 id="issue-form-title">
				{editingIssue ? $t('edit') : $t('addNewIssue')}
			</h2>
			<IssueForm
				pages={report?.pages || []}
				onSubmit={handleSubmitIssue}
				onCancel={handleCancelForm}
				initialData={editingIssue
					? {
							page: editingIssue.page,
							criterionNumber: editingIssue.criterionNumber,
							title: editingIssue.title,
							description: editingIssue.description,
							location: editingIssue.location,
							screenshot: editingIssue.screenshot,
							notes: editingIssue.notes,
							priority: editingIssue.priority
						}
					: duplicatingIssueData
						? {
								page: duplicatingIssueData.page,
								criterionNumber: duplicatingIssueData.criterionNumber,
								title: duplicatingIssueData.title,
								description: duplicatingIssueData.description,
								location: duplicatingIssueData.location,
								notes: duplicatingIssueData.notes,
								priority: duplicatingIssueData.priority
							}
						: undefined}
			/>
		</div>
	</div>
{/if}

{#if showWeeklyReportDialog}
	<div
		class="modal-overlay"
		onclick={(e) => {
			if (e.target === e.currentTarget) cancelWeeklyReport();
		}}
		onkeydown={handleWeeklyReportKeydown}
		role="dialog"
		aria-labelledby="weekly-report-dialog-title"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal">
			<h2 id="weekly-report-dialog-title">{$t('selectStartDate')}</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					generateAndCopyWeeklyReport();
				}}
			>
				<div class="form-group">
					<label for="startDate">{$t('startDate')}:</label>
					<input
						type="date"
						id="startDate"
						bind:value={weeklyReportStartDate}
						bind:this={startDateInput}
						required
					/>
				</div>
				<div class="modal-actions">
					<button type="submit" class="btn-primary">{$t('generateReport')}</button>
					<button type="button" onclick={cancelWeeklyReport} class="btn-secondary">
						{$t('cancel')}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showAxeScanDialog}
	<AxeScanDialog onClose={handleCloseAxeScan} onImportResults={handleImportAxeResults} />
{/if}

{#if axeScanData}
	<AxeResultsPage
		scanData={axeScanData}
		onSave={handleSaveAxeResults}
		onCancel={handleCancelAxeResults}
	/>
{/if}

{#if showJiraConfigModal}
	<JiraConfigModal
		initialConfig={report?.jiraConfig}
		onSave={handleJiraConfigSave}
		onCancel={handleJiraConfigCancel}
	/>
{/if}

{#if showJiraCreateModal && jiraIssueToCreate && report?.jiraConfig}
	<JiraCreateModal
		issue={jiraIssueToCreate}
		jiraConfig={report.jiraConfig}
		onSuccess={handleJiraCreateSuccess}
		onCancel={handleJiraCreateCancel}
		onConfigureJira={handleOpenJiraConfig}
	/>
{/if}

{#if showMergeReportsModal}
	<MergeReportsModal
		onMerge={handleMergeReportsComplete}
		onCancel={handleMergeReportsCancel}
	/>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
			sans-serif;
		color: #212529;
		background-color: #f8f9fa;
		line-height: 1.6;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		background-color: #ffffff;
		border-bottom: 1px solid #dee2e6;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		color: #1a1a1a;
	}

	.language-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.language-selector label {
		font-weight: 500;
	}

	.language-selector select {
		padding: 0.5rem;
		border: 2px solid #ced4da;
		border-radius: 4px;
		font-size: 1rem;
	}

	.language-selector select:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	main {
		flex: 1;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.welcome {
		text-align: center;
		padding: 4rem 1rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.welcome h2 {
		margin-bottom: 2rem;
		color: #6c757d;
	}

	.welcome-actions {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 3rem;
	}

	.onboarding {
		background-color: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		padding: 2rem;
		text-align: left;
		margin-top: 2rem;
	}

	.onboarding h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		color: #1a1a1a;
	}

	.onboarding ul {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin: 0;
	}

	.onboarding li {
		margin-bottom: 0.75rem;
		line-height: 1.6;
		color: #212529;
	}

	.onboarding li:last-child {
		margin-bottom: 0;
	}

	.onboarding a {
		color: #0066cc;
		text-decoration: none;
		font-weight: 500;
	}

	.onboarding a:hover {
		text-decoration: underline;
	}

	.onboarding a:focus {
		outline: 2px solid #0066cc;
		outline-offset: 2px;
		border-radius: 2px;
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

	.report-header {
		margin-bottom: 2rem;
	}

	.report-info h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
	}

	.meta {
		margin: 0;
		color: #6c757d;
		font-size: 0.875rem;
	}

	.report-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filter-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-controls label {
		font-weight: 500;
	}

	.filter-controls select {
		padding: 0.5rem 0.75rem;
		border: 2px solid #ced4da;
		border-radius: 4px;
		font-size: 1rem;
		min-width: 200px;
	}

	.filter-controls select:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.issues-section {
		margin-bottom: 2rem;
	}

	.issues-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
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
		text-decoration: none;
		text-align: center;
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

	.modal-large {
		max-width: 800px;
		max-height: calc(100vh - 2rem);
	}

	.modal h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		color: #1a1a1a;
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

	.form-group input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		border: 2px solid #ced4da;
		border-radius: 6px;
		transition: border-color 0.2s, box-shadow 0.2s;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
	}

	.form-group input:hover:not(:focus) {
		border-color: #adb5bd;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e9ecef;
	}

	.sr-only {
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

	@media (max-width: 768px) {
		h1 {
			font-size: 1.5rem;
		}

		.header-content {
			flex-direction: column;
			align-items: flex-start;
		}

		.controls {
			flex-direction: column;
			align-items: stretch;
		}

		.filter-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.filter-controls select {
			width: 100%;
		}

		.report-actions {
			flex-direction: column;
		}

		.report-actions button {
			width: 100%;
		}

		.modal {
			padding: 1.5rem;
			margin: 0.5rem;
			max-height: calc(100vh - 1rem);
		}

		.modal-large {
			max-height: calc(100vh - 1rem);
		}
	}

	/* Dark mode support for modals */
	@media (prefers-color-scheme: dark) {
		.modal {
			background: #2d2d2d;
			color: #e9ecef;
		}

		.modal h2 {
			color: #e9ecef;
		}

		.form-group label {
			color: #e9ecef;
		}

		.form-group input {
			background-color: #1a1a1a;
			color: #e9ecef;
			border-color: #495057;
		}

		.form-group input:hover:not(:focus) {
			border-color: #6c757d;
		}

		.modal-actions {
			border-top-color: #495057;
		}
	}
</style>
