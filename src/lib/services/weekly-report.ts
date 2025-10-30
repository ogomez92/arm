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
 * Generate weekly report in markdown format
 */
export interface WeeklyReportTranslations {
	weeklyReport: string;
	thisWeek: string;
	totalIssuesFound: string;
	followingCriteria: string;
	comparisonPrevious: string;
	issuesGoneUp: string;
	issuesGoneDown: string;
	issuesStayedSame: string;
	noIssuesPreviousWeek: string;
	noIssuesThisWeek: string;
}

export function generateWeeklyReport(
	report: Report,
	translations: WeeklyReportTranslations,
	language: Language = 'en'
): string {
	const currentWeekIssues = getWeeklyIssues(report.issues, 0);
	const previousWeekIssues = getWeeklyIssues(report.issues, -1);

	const currentWeekCount = currentWeekIssues.length;
	const previousWeekCount = previousWeekIssues.length;

	let markdown = `# ${report.name} ${translations.weeklyReport}\n\n`;

	if (currentWeekCount === 0) {
		markdown += `${translations.noIssuesThisWeek}\n`;
		return markdown;
	}

	// Current week summary
	markdown += `${translations.thisWeek}, ${translations.totalIssuesFound} **${currentWeekCount}** ${translations.followingCriteria}\n\n`;

	// Breakdown by criteria
	const criteriaPercentages = calculateCriteriaPercentages(currentWeekIssues, language);

	// Sort by criterion number
	const sortedEntries = Array.from(criteriaPercentages.entries()).sort((a, b) => {
		return a[0].localeCompare(b[0], undefined, { numeric: true });
	});

	sortedEntries.forEach(([criterionNumber, data]) => {
		markdown += `- **${criterionNumber}** ${data.name} - ${data.percentage}%\n`;
	});

	// Comparison with previous week
	if (previousWeekCount > 0) {
		markdown += `\n`;
		const change = calculatePercentageChange(currentWeekCount, previousWeekCount);

		if (change.direction === 'up') {
			markdown += `${translations.comparisonPrevious} ${translations.issuesGoneUp} **+${change.percentage}%**.\n`;
		} else if (change.direction === 'down') {
			markdown += `${translations.comparisonPrevious} ${translations.issuesGoneDown} **-${change.percentage}%**.\n`;
		} else {
			markdown += `${translations.comparisonPrevious} ${translations.issuesStayedSame}\n`;
		}
	} else {
		markdown += `\n${translations.noIssuesPreviousWeek}\n`;
	}

	return markdown;
}
