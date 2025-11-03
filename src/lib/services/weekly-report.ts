import type { Report, Issue, Language } from '../types';
import { wcagCriteria } from '../wcag-criteria';

/**
 * Get the start and end dates for a given week
 * @param weekOffset 0 for current week, -1 for previous week, etc.
 */
export function getWeekRange(weekOffset: number = 0): { start: Date; end: Date } {
	const now = new Date();
	const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)

	// Calculate start of current week (Sunday)
	const startOfCurrentWeek = new Date(now);
	startOfCurrentWeek.setDate(now.getDate() - currentDay);
	startOfCurrentWeek.setHours(0, 0, 0, 0);

	// Apply week offset
	const start = new Date(startOfCurrentWeek);
	start.setDate(startOfCurrentWeek.getDate() + (weekOffset * 7));

	// End of week is Saturday 23:59:59
	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	end.setHours(23, 59, 59, 999);

	return { start, end };
}

/**
 * Filter issues by date range
 */
export function filterIssuesByDateRange(issues: Issue[], start: Date, end: Date): Issue[] {
	return issues.filter(issue => {
		const issueDate = new Date(issue.createdAt);
		return issueDate >= start && issueDate <= end;
	});
}

/**
 * Get issues for a specific week
 */
export function getWeeklyIssues(issues: Issue[], weekOffset: number = 0): Issue[] {
	const { start, end } = getWeekRange(weekOffset);
	return filterIssuesByDateRange(issues, start, end);
}

/**
 * Calculate percentage of issues by criterion
 */
export function calculateCriteriaPercentages(issues: Issue[], language: Language = 'en'): Map<string, { count: number; percentage: number; name: string }> {
	const total = issues.length;
	if (total === 0) return new Map();

	const criteriaCounts = new Map<string, number>();

	// Count issues by criterion
	issues.forEach(issue => {
		const count = criteriaCounts.get(issue.criterionNumber) || 0;
		criteriaCounts.set(issue.criterionNumber, count + 1);
	});

	// Calculate percentages and include criterion names
	const result = new Map<string, { count: number; percentage: number; name: string }>();
	criteriaCounts.forEach((count, criterionNumber) => {
		const percentage = Math.round((count / total) * 100);
		const criterion = wcagCriteria.find(c => c.number === criterionNumber);
		const name = criterion ? (language === 'es' ? criterion.titleEs : criterion.title) : '';
		result.set(criterionNumber, { count, percentage, name });
	});

	return result;
}

/**
 * Count issues by priority
 */
export function countIssuesByPriority(issues: Issue[]): { blocker: number; medium: number; low: number } {
	const counts = { blocker: 0, medium: 0, low: 0 };

	issues.forEach(issue => {
		if (issue.priority === 3) {
			counts.blocker++;
		} else if (issue.priority === 2) {
			counts.medium++;
		} else if (issue.priority === 1) {
			counts.low++;
		}
	});

	return counts;
}

/**
 * Calculate percentage change between two weeks
 */
export function calculatePercentageChange(currentWeekCount: number, previousWeekCount: number): { direction: 'up' | 'down' | 'same'; percentage: number } {
	if (previousWeekCount === 0) {
		return { direction: currentWeekCount > 0 ? 'up' : 'same', percentage: 100 };
	}

	const change = currentWeekCount - previousWeekCount;
	const percentageChange = Math.round((Math.abs(change) / previousWeekCount) * 100);

	if (change > 0) {
		return { direction: 'up', percentage: percentageChange };
	} else if (change < 0) {
		return { direction: 'down', percentage: percentageChange };
	} else {
		return { direction: 'same', percentage: 0 };
	}
}

/**
 * Format priority list with proper grammar (using "and" before the last item)
 */
function formatPriorityList(parts: string[]): string {
	if (parts.length === 0) return '';
	if (parts.length === 1) return parts[0];
	if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
	// For 3 or more items, use commas and "and" before the last item
	const allButLast = parts.slice(0, -1).join(', ');
	return `${allButLast}, and ${parts[parts.length - 1]}`;
}

/**
 * Generate weekly report in markdown format based on a start date
 */
export interface WeeklyReportTranslations {
	weeklyReport: string;
	since: string;
	totalIssuesFound: string;
	followingCriteria: string;
	noIssuesFound: string;
	ofWhich: string;
	areBlocker: string;
	areMedium: string;
	areLow: string;
}

export function generateWeeklyReport(
	report: Report,
	startDate: Date,
	translations: WeeklyReportTranslations,
	language: Language = 'en'
): string {
	// Get all issues since the start date
	const endDate = new Date(); // Now
	const issuesSinceDate = filterIssuesByDateRange(report.issues, startDate, endDate);
	const issueCount = issuesSinceDate.length;

	// Format the date as M/D/YYYY
	const formattedDate = `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`;

	let markdown = `# ${report.name} ${translations.weeklyReport}\n\n`;

	if (issueCount === 0) {
		markdown += `${translations.since} ${formattedDate}: ${translations.noIssuesFound}\n`;
		return markdown;
	}

	// Issues summary
	const priorities = countIssuesByPriority(issuesSinceDate);
	markdown += `${translations.since} ${formattedDate}, ${translations.totalIssuesFound} **${issueCount}** ${translations.followingCriteria}`;

	// Add priority breakdown
	const priorityParts: string[] = [];
	if (priorities.blocker > 0) {
		priorityParts.push(`${priorities.blocker} ${translations.areBlocker}`);
	}
	if (priorities.medium > 0) {
		priorityParts.push(`${priorities.medium} ${translations.areMedium}`);
	}
	if (priorities.low > 0) {
		priorityParts.push(`${priorities.low} ${translations.areLow}`);
	}

	if (priorityParts.length > 0) {
		markdown += ` (${translations.ofWhich} ${formatPriorityList(priorityParts)})`;
	}

	markdown += `\n\n`;

	// Breakdown by criteria
	const criteriaPercentages = calculateCriteriaPercentages(issuesSinceDate, language);

	// Sort by criterion number
	const sortedEntries = Array.from(criteriaPercentages.entries()).sort((a, b) => {
		return a[0].localeCompare(b[0], undefined, { numeric: true });
	});

	sortedEntries.forEach(([criterionNumber, data]) => {
		markdown += `- **${criterionNumber}** ${data.name} - ${data.percentage}%\n`;
	});

	return markdown;
}

/**
 * Translations needed for criteria summaries
 */
export interface CriteriaSummariesTranslations {
	inThe: string;
	pageWord: string;
}

/**
 * Generate criteria summaries with page and issue information
 */
export function generateCriteriaSummaries(
	report: Report,
	translations: CriteriaSummariesTranslations,
	language: Language = 'en'
): string {
	// Group issues by criterion number
	const issuesByCriterion = new Map<string, Issue[]>();

	report.issues.forEach(issue => {
		const issues = issuesByCriterion.get(issue.criterionNumber) || [];
		issues.push(issue);
		issuesByCriterion.set(issue.criterionNumber, issues);
	});

	// Sort criterion numbers numerically
	const sortedCriteria = Array.from(issuesByCriterion.keys()).sort((a, b) => {
		return a.localeCompare(b, undefined, { numeric: true });
	});

	const summaries: string[] = [];

	sortedCriteria.forEach(criterionNumber => {
		const issues = issuesByCriterion.get(criterionNumber) || [];

		// Get criterion name
		const criterion = wcagCriteria.find(c => c.number === criterionNumber);
		const criterionName = criterion ? (language === 'es' ? criterion.titleEs : criterion.title) : '';

		// Add criterion header
		let summary = `${criterionNumber} ${criterionName}\n`;

		// Group issues by page
		const issuesByPage = new Map<string, Issue[]>();
		issues.forEach(issue => {
			const pageIssues = issuesByPage.get(issue.page) || [];
			pageIssues.push(issue);
			issuesByPage.set(issue.page, pageIssues);
		});

		// Build page summaries
		const pageSummaries: string[] = [];
		issuesByPage.forEach((pageIssues, pageName) => {
			// Format each issue as "title in location"
			const issueTexts = pageIssues.map(issue => {
				return issue.location ? `${issue.title} in ${issue.location}` : issue.title;
			});
			pageSummaries.push(`${translations.inThe} ${pageName} ${translations.pageWord}, ${issueTexts.join('. ')}`);
		});

		// Join all page summaries into one paragraph
		summary += pageSummaries.join('. ') + '.';

		summaries.push(summary);
	});

	return summaries.join('\n\n');
}
