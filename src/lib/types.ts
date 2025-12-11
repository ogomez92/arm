export interface WCAGCriterion {
	number: string;
	title: string;
	titleEs: string;
	level: 'A' | 'AA' | 'AAA';
	principle: string;
	principleEs: string;
}

export type Priority = 1 | 2 | 3; // 1: Low, 2: Medium, 3: Blocker

export interface Issue {
	id: string;
	page: string;
	criterionNumber: string;
	title: string;
	description: string;
	location: string;
	screenshot?: string; // base64 encoded image
	notes: string;
	priority: Priority;
	createdAt: string;
	updatedAt: string;
	jiraTicketUrl?: string; // URL to the Jira ticket if created
	jiraTicketKey?: string; // Jira ticket key (e.g., "PROJ-123")
}

export interface JiraConfig {
	baseUrl: string; // e.g., "https://company.atlassian.net"
	apiToken: string; // Jira API token
	userEmail: string; // User email for authentication
	projectKey?: string; // Default project key (derived from URL or set manually)
}

export interface Report {
	id: string;
	name: string;
	pages: string[];
	issues: Issue[];
	createdAt: string;
	updatedAt: string;
	jiraConfig?: JiraConfig; // Jira configuration for this report
}

export type Language = 'en' | 'es';
