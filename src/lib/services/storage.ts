import type { Report, Issue } from '../types';

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
		link.download = `${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.json`;
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
}
