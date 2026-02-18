import type { Report, Issue } from '../types';
import { wcagCriteria } from '../wcag-criteria';
import { getPriorityLabel } from '../utils/priority';
import { getWCAGCriterionTitle } from '../utils/wcag';
import { formatDateTimeForFilename } from './storage';

type SortBy = 'page' | 'criteria' | 'priority';

export class HTMLExport {
	static generateHTML(report: Report, language: 'en' | 'es', sortBy: SortBy = 'priority'): string {
		const isSpanish = language === 'es';
		const title = isSpanish ? 'Informe de Accesibilidad' : 'Accessibility Report';
		const pageLabel = isSpanish ? 'Página' : 'Page';
		const criterionLabel = isSpanish ? 'Criterio WCAG' : 'WCAG Criterion';
		const titleLabel = isSpanish ? 'Título' : 'Title';
		const priorityLabel = isSpanish ? 'Prioridad' : 'Priority';
		const descriptionLabel = isSpanish ? 'Descripción' : 'Description';
		const locationLabel = isSpanish ? 'Ubicación' : 'Location';
		const screenshotLabel = isSpanish ? 'Captura de Pantalla' : 'Screenshot';
		const notesLabel = isSpanish ? 'Notas y Soluciones' : 'Notes and Solutions';
		const createdLabel = isSpanish ? 'Creado' : 'Created';
		const updatedLabel = isSpanish ? 'Actualizado' : 'Updated';
		const issuesLabel = isSpanish ? 'problemas encontrados' : 'issues found';
		const jiraLabel = isSpanish ? 'Ticket de Jira' : 'Jira Ticket';

		const sortIssues = (issues: Issue[]): Issue[] => {
			const issuesCopy = [...issues];
			switch (sortBy) {
				case 'page':
					return issuesCopy.sort((a, b) => a.page.localeCompare(b.page));
				case 'criteria':
					return issuesCopy.sort((a, b) => a.criterionNumber.localeCompare(b.criterionNumber));
				case 'priority':
				default:
					return issuesCopy.sort((a, b) => b.priority - a.priority);
			}
		};

		const issuesByPage = new Map<string, typeof report.issues>();
		report.pages.forEach((page) => {
			const pageIssues = sortIssues(report.issues.filter((issue) => issue.page === page));
			issuesByPage.set(page, pageIssues);
		});

		const issuesHTML = Array.from(issuesByPage.entries())
			.map(([page, issues]) => {
				const issuesItems = issues
					.map((issue) => {
						const criterion = wcagCriteria.find((c) => c.number === issue.criterionNumber);
						const screenshotHTML = issue.screenshot
							? `
							<div class="field">
								<strong>${screenshotLabel}:</strong>
								<img src="${issue.screenshot}" alt="${issue.location}" style="max-width: 100%; height: auto; border: 1px solid #dee2e6; border-radius: 4px; margin-top: 8px;" />
							</div>
						`
							: '';

						const jiraHTML =
							issue.jiraTicketUrl && issue.jiraTicketKey
								? `
							<div class="field">
								<strong>${jiraLabel}:</strong>
								<a href="${this.escapeHTML(issue.jiraTicketUrl)}" target="_blank" rel="noopener noreferrer" class="jira-link">${this.escapeHTML(issue.jiraTicketKey)}</a>
							</div>
						`
								: '';

						return `
						<div class="issue-item">
							<h3>${issue.title}</h3>
							<div class="field">
								<strong>${priorityLabel}:</strong> <span class="priority priority-${issue.priority}">${getPriorityLabel(issue.priority, language)}</span>
							</div>
							<div class="field">
								<strong>${criterionLabel}:</strong> ${criterion?.number} - ${getWCAGCriterionTitle(issue.criterionNumber, language)} (${criterionLabel} ${criterion?.level})
							</div>
							<div class="field">
								<strong>${descriptionLabel}:</strong>
								<p style="white-space: pre-wrap; margin: 4px 0 0 0;">${this.escapeHTML(issue.description)}</p>
							</div>
							<div class="field">
								<strong>${locationLabel}:</strong> ${this.escapeHTML(issue.location)}
							</div>
							${screenshotHTML}
							<div class="field">
								<strong>${notesLabel}:</strong>
								<p style="white-space: pre-wrap; margin: 4px 0 0 0;">${this.escapeHTML(issue.notes)}</p>
							</div>
							${jiraHTML}
							<div class="field meta">
								<small>${createdLabel}: ${new Date(issue.createdAt).toLocaleString(language)}</small>
								<small>${updatedLabel}: ${new Date(issue.updatedAt).toLocaleString(language)}</small>
							</div>
						</div>
					`;
					})
					.join('');

				return `
				<section class="page-section">
					<h2>${pageLabel}: ${this.escapeHTML(page)}</h2>
					${issuesItems}
				</section>
			`;
			})
			.join('');

		return `<!DOCTYPE html>
<html lang="${language}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title} - ${this.escapeHTML(report.name)}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #212529;
			background-color: #fff;
			padding: 2rem;
			max-width: 1200px;
			margin: 0 auto;
		}

		header {
			margin-bottom: 2rem;
			padding-bottom: 1rem;
			border-bottom: 2px solid #dee2e6;
		}

		h1 {
			font-size: 2rem;
			margin-bottom: 0.5rem;
			color: #1a1a1a;
		}

		.meta-info {
			color: #6c757d;
			font-size: 0.9rem;
		}

		h2 {
			font-size: 1.5rem;
			margin-top: 2rem;
			margin-bottom: 1rem;
			color: #1a1a1a;
			padding-bottom: 0.5rem;
			border-bottom: 1px solid #dee2e6;
		}

		h3 {
			font-size: 1.2rem;
			margin-bottom: 0.75rem;
			color: #2c3e50;
		}

		.page-section {
			margin-bottom: 3rem;
		}

		.issue-item {
			background: #f8f9fa;
			border: 1px solid #dee2e6;
			border-radius: 8px;
			padding: 1.5rem;
			margin-bottom: 1.5rem;
		}

		.field {
			margin-bottom: 1rem;
		}

		.field:last-child {
			margin-bottom: 0;
		}

		.field strong {
			color: #495057;
			display: block;
			margin-bottom: 0.25rem;
		}

		.field.meta {
			margin-top: 1rem;
			padding-top: 1rem;
			border-top: 1px solid #dee2e6;
			display: flex;
			gap: 1rem;
			flex-wrap: wrap;
		}

		.field.meta small {
			color: #6c757d;
		}

		.priority {
			display: inline-block;
			padding: 0.25rem 0.75rem;
			font-size: 0.875rem;
			font-weight: 600;
			border-radius: 12px;
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

		@media print {
			body {
				padding: 1rem;
			}

			.issue-item {
				page-break-inside: avoid;
			}
		}
	</style>
</head>
<body>
	<header>
		<h1>${title}: ${this.escapeHTML(report.name)}</h1>
		<div class="meta-info">
			<p>${createdLabel}: ${new Date(report.createdAt).toLocaleString(language)}</p>
			<p>${updatedLabel}: ${new Date(report.updatedAt).toLocaleString(language)}</p>
			<p><strong>${report.issues.length} ${issuesLabel}</strong></p>
		</div>
	</header>

	<main>
		${issuesHTML}
	</main>
</body>
</html>`;
	}

	static escapeHTML(str: string): string {
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	static downloadHTML(report: Report, language: 'en' | 'es', sortBy: SortBy = 'priority'): void {
		const html = this.generateHTML(report, language, sortBy);
		const blob = new Blob([html], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		const dateTime = formatDateTimeForFilename();
		link.download = `${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dateTime}.html`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
}
