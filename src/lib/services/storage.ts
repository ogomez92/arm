import type { Report, Issue, JiraConfig } from '../types';

export function formatDateTimeForFilename(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export class ReportStorage {
	static createNewReport(name: string): Report {
		const now = new Date().toISOString();
		return {
			id: crypto.randomUUID(),
			name,
			pages: [],
			issues: [],
			createdAt: now,
			updatedAt: now
		};
	}

	static loadReportFromFile(file: File): Promise<Report> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const report = JSON.parse(e.target?.result as string) as Report;
					if (!this.validateReport(report)) {
						reject(new Error('Invalid report format'));
						return;
					}
					resolve(report);
				} catch (error) {
					reject(error);
				}
			};
			reader.onerror = () => reject(new Error('Error reading file'));
			reader.readAsText(file);
		});
	}

	static validateReport(report: unknown): report is Report {
		if (typeof report !== 'object' || report === null) return false;
		const r = report as Record<string, unknown>;
		return (
			typeof r.id === 'string' &&
			typeof r.name === 'string' &&
			Array.isArray(r.pages) &&
			Array.isArray(r.issues) &&
			typeof r.createdAt === 'string' &&
			typeof r.updatedAt === 'string'
		);
	}

	static downloadReport(report: Report): void {
		const dataStr = JSON.stringify(report, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		const dateTime = formatDateTimeForFilename();
		link.download = `${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dateTime}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	static addIssue(report: Report, issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Report {
		const now = new Date().toISOString();
		const newIssue: Issue = {
			...issue,
			id: crypto.randomUUID(),
			createdAt: now,
			updatedAt: now
		};

		const pages = report.pages.includes(issue.page)
			? report.pages
			: [...report.pages, issue.page];

		return {
			...report,
			pages,
			issues: [...report.issues, newIssue],
			updatedAt: now
		};
	}

	static updateIssue(report: Report, issueId: string, updates: Partial<Issue>): Report {
		const now = new Date().toISOString();
		const issues = report.issues.map((issue) =>
			issue.id === issueId ? { ...issue, ...updates, updatedAt: now } : issue
		);

		const oldIssue = report.issues.find((i) => i.id === issueId);
		const newPage = updates.page;
		let pages = report.pages;

		if (newPage && oldIssue?.page !== newPage && !pages.includes(newPage)) {
			pages = [...pages, newPage];
		}

		return {
			...report,
			pages,
			issues,
			updatedAt: now
		};
	}

	static deleteIssue(report: Report, issueId: string): Report {
		const now = new Date().toISOString();
		const issues = report.issues.filter((issue) => issue.id !== issueId);

		const usedPages = new Set(issues.map((i) => i.page));
		const pages = report.pages.filter((page) => usedPages.has(page));

		return {
			...report,
			pages,
			issues,
			updatedAt: now
		};
	}

	/**
	 * Merges two reports into one, preserving all data from both.
	 * Uses a Set-based approach to avoid duplicates while keeping all unique entries.
	 * Issues are merged by comparing their IDs - if an issue exists in both reports,
	 * the one with the more recent updatedAt timestamp is kept.
	 */
	static mergeReports(report1: Report, report2: Report, newTitle: string): Report {
		const now = new Date().toISOString();

		// Create a map of issues by ID to handle potential duplicates intelligently
		const issueMap = new Map<string, Issue>();

		// Add all issues from report1
		for (const issue of report1.issues) {
			issueMap.set(issue.id, issue);
		}

		// Add issues from report2, keeping the more recent version if duplicate ID exists
		for (const issue of report2.issues) {
			const existing = issueMap.get(issue.id);
			if (!existing) {
				issueMap.set(issue.id, issue);
			} else {
				// Keep the more recently updated version
				const existingDate = new Date(existing.updatedAt).getTime();
				const newDate = new Date(issue.updatedAt).getTime();
				if (newDate > existingDate) {
					issueMap.set(issue.id, issue);
				}
			}
		}

		// Merge all issues
		const mergedIssues = Array.from(issueMap.values());

		// Merge pages - use a Set to avoid duplicates
		const allPages = new Set<string>([...report1.pages, ...report2.pages]);

		// Also include any pages referenced by issues that might not be in the pages array
		for (const issue of mergedIssues) {
			allPages.add(issue.page);
		}

		// Merge jiraConfig - use whichever report has a complete config
		// A complete config has baseUrl, apiToken, and userEmail
		const isCompleteConfig = (config?: JiraConfig) =>
			config?.baseUrl && config?.apiToken && config?.userEmail;

		let jiraConfig: JiraConfig | undefined;
		if (isCompleteConfig(report1.jiraConfig)) {
			jiraConfig = report1.jiraConfig;
		} else if (isCompleteConfig(report2.jiraConfig)) {
			jiraConfig = report2.jiraConfig;
		} else {
			// Fall back to partial config if available
			jiraConfig = report1.jiraConfig || report2.jiraConfig;
		}

		return {
			id: crypto.randomUUID(),
			name: newTitle,
			pages: Array.from(allPages),
			issues: mergedIssues,
			createdAt: now,
			updatedAt: now,
			jiraConfig
		};
	}
}
