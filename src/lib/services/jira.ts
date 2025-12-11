import type { JiraConfig, Issue, Priority } from '../types';
import { wcagCriteria } from '../wcag-criteria';
import { getPriorityLabel } from '../utils/priority';
import { getWCAGCriterionTitle } from '../utils/wcag';

/**
 * CORS Proxy Configuration
 *
 * The proxy server runs on jiraproxy.oriolgomez.com (see jira-proxy/ folder)
 *
 * The proxy forwards requests to Jira's API to bypass browser CORS restrictions.
 * NO DATA is collected, logged, or stored by the proxy.
 */
const JIRA_PROXY_URL: string = 'https://jiraproxy.oriolgomez.com/proxy';

export interface JiraIssueType {
	id: string;
	name: string;
}

export interface JiraPriority {
	id: string;
	name: string;
}

export interface JiraProject {
	id: string;
	key: string;
	name: string;
}

export interface JiraCreateIssueData {
	projectKey: string;
	summary: string;
	description: string;
	issueType: string; // 'Bug', 'Task', 'Story'
	priority?: string; // 'Highest', 'High', 'Medium', 'Low', 'Lowest'
	labels?: string[];
	parentEpicKey?: string; // Optional epic to link as parent
}

export interface JiraCreateIssueResponse {
	id: string;
	key: string;
	self: string;
}

export interface JiraApiError {
	errorMessages: string[];
	errors: Record<string, string>;
}

export interface JiraUrlParseResult {
	type: 'project' | 'board' | 'epic' | 'issue' | 'unknown';
	projectKey: string;
	epicKey?: string;
	boardId?: string;
	issueKey?: string;
	label: string; // Human-readable description
}

export class JiraService {
	private config: JiraConfig;

	constructor(config: JiraConfig) {
		this.config = config;
	}

	/**
	 * Parse a Jira URL and extract project, board, epic, or issue information
	 * Examples:
	 * - https://company.atlassian.net/jira/software/c/projects/PROJ/boards/123
	 * - https://company.atlassian.net/browse/PROJ-123
	 * - https://company.atlassian.net/projects/PROJ
	 */
	static parseJiraUrl(url: string): JiraUrlParseResult | null {
		try {
			const urlObj = new URL(url);
			const path = urlObj.pathname;

			// Board URL: /jira/software/c/projects/PROJ/boards/123
			const boardMatch = path.match(/\/projects\/([A-Z][A-Z0-9]+)\/boards\/(\d+)/i);
			if (boardMatch) {
				const projectKey = boardMatch[1];
				const boardId = boardMatch[2];
				return {
					type: 'board',
					projectKey,
					boardId,
					label: `Board ${boardId} (Project ${projectKey})`
				};
			}

			// Issue/Epic URL: /browse/PROJ-123
			const browseMatch = path.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i);
			if (browseMatch) {
				const issueKey = browseMatch[1];
				const projectKey = issueKey.split('-')[0];
				// We'll treat it as epic for now (could verify with API later)
				return {
					type: 'epic',
					projectKey,
					epicKey: issueKey,
					issueKey,
					label: `Epic/Issue ${issueKey} (Project ${projectKey})`
				};
			}

			// Project URL: /projects/PROJ
			const projectMatch = path.match(/\/projects\/([A-Z][A-Z0-9]+)/i);
			if (projectMatch) {
				const projectKey = projectMatch[1];
				return {
					type: 'project',
					projectKey,
					label: `Project ${projectKey}`
				};
			}

			// Direct project key (not a URL)
			const directKeyMatch = url.match(/^([A-Z][A-Z0-9]+)$/i);
			if (directKeyMatch) {
				const projectKey = directKeyMatch[1];
				return {
					type: 'project',
					projectKey,
					label: `Project ${projectKey}`
				};
			}

			return null;
		} catch {
			// Not a valid URL, try as direct project key
			const directKeyMatch = url.match(/^([A-Z][A-Z0-9]+)$/i);
			if (directKeyMatch) {
				const projectKey = directKeyMatch[1];
				return {
					type: 'project',
					projectKey,
					label: `Project ${projectKey}`
				};
			}
			return null;
		}
	}

	private getAuthHeader(): string {
		const credentials = btoa(`${this.config.userEmail}:${this.config.apiToken}`);
		return `Basic ${credentials}`;
	}

	private getBaseApiUrl(): string {
		// Remove trailing slash if present
		const baseUrl = this.config.baseUrl.replace(/\/$/, '');
		return `${baseUrl}/rest/api/3`;
	}

	/**
	 * Makes a fetch request through the CORS proxy (localhost:6904)
	 */
	private async fetchWithProxy(
		url: string,
		options: {
			method?: string;
			headers?: Record<string, string>;
			body?: unknown;
		} = {}
	): Promise<Response> {
		// Use proxy server
		const response = await fetch(JIRA_PROXY_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				url,
				method: options.method || 'GET',
				headers: options.headers || {},
				body: options.body
			})
		});

		const result = await response.json();

		// Create a Response-like object that matches the original fetch API
		return {
			ok: result.ok,
			status: result.status,
			statusText: result.statusText,
			json: async () => result.data
		} as Response;
	}

	async testConnection(): Promise<boolean> {
		try {
			const response = await this.fetchWithProxy(`${this.getBaseApiUrl()}/myself`, {
				method: 'GET',
				headers: {
					Authorization: this.getAuthHeader(),
					Accept: 'application/json'
				}
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async getProjects(): Promise<JiraProject[]> {
		const response = await this.fetchWithProxy(`${this.getBaseApiUrl()}/project/search`, {
			method: 'GET',
			headers: {
				Authorization: this.getAuthHeader(),
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch projects: ${response.statusText}`);
		}

		const data = await response.json();
		return data.values || [];
	}

	async getIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
		const response = await this.fetchWithProxy(
			`${this.getBaseApiUrl()}/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`,
			{
				method: 'GET',
				headers: {
					Authorization: this.getAuthHeader(),
					Accept: 'application/json'
				}
			}
		);

		if (!response.ok) {
			// Fallback to default issue types if API doesn't support this endpoint
			return [
				{ id: '10001', name: 'Bug' },
				{ id: '10002', name: 'Task' },
				{ id: '10003', name: 'Story' }
			];
		}

		const data = await response.json();
		const project = data.projects?.[0];
		return project?.issuetypes || [];
	}

	async getPriorities(): Promise<JiraPriority[]> {
		const response = await this.fetchWithProxy(`${this.getBaseApiUrl()}/priority`, {
			method: 'GET',
			headers: {
				Authorization: this.getAuthHeader(),
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			// Fallback to default priorities
			return [
				{ id: '1', name: 'Highest' },
				{ id: '2', name: 'High' },
				{ id: '3', name: 'Medium' },
				{ id: '4', name: 'Low' },
				{ id: '5', name: 'Lowest' }
			];
		}

		return await response.json();
	}

	async createIssue(data: JiraCreateIssueData): Promise<JiraCreateIssueResponse> {
		const requestBody: Record<string, unknown> = {
			fields: {
				project: {
					key: data.projectKey
				},
				summary: data.summary,
				description: {
					type: 'doc',
					version: 1,
					content: [
						{
							type: 'paragraph',
							content: [
								{
									type: 'text',
									text: data.description
								}
							]
						}
					]
				},
				issuetype: {
					name: data.issueType
				}
			}
		};

		if (data.priority) {
			(requestBody.fields as Record<string, unknown>).priority = { name: data.priority };
		}

		if (data.labels && data.labels.length > 0) {
			(requestBody.fields as Record<string, unknown>).labels = data.labels;
		}

		if (data.parentEpicKey) {
			(requestBody.fields as Record<string, unknown>).parent = { key: data.parentEpicKey };
		}

		const response = await this.fetchWithProxy(`${this.getBaseApiUrl()}/issue`, {
			method: 'POST',
			headers: {
				Authorization: this.getAuthHeader(),
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: requestBody
		});

		if (!response.ok) {
			const errorData = (await response.json()) as JiraApiError;
			const errorMessage =
				errorData.errorMessages?.join(', ') ||
				Object.values(errorData.errors || {}).join(', ') ||
				response.statusText;
			throw new Error(errorMessage);
		}

		return await response.json();
	}

	getTicketUrl(ticketKey: string): string {
		const baseUrl = this.config.baseUrl.replace(/\/$/, '');
		return `${baseUrl}/browse/${ticketKey}`;
	}

	/**
	 * Converts an accessibility issue to Jira issue data
	 */
	static issueToJiraData(
		issue: Issue,
		projectKey: string,
		language: 'en' | 'es' = 'en'
	): JiraCreateIssueData {
		const criterion = wcagCriteria.find((c) => c.number === issue.criterionNumber);
		const criterionTitle = getWCAGCriterionTitle(issue.criterionNumber, language);
		const priorityLabel = getPriorityLabel(issue.priority, language);

		// Build description with all relevant information
		const descriptionParts: string[] = [];

		// Add WCAG criterion info
		if (criterion) {
			descriptionParts.push(
				`WCAG Criterion: ${criterion.number} - ${criterionTitle} (Level ${criterion.level})`
			);
		}

		// Add priority
		descriptionParts.push(`Priority: ${priorityLabel}`);

		// Add page
		descriptionParts.push(`Page: ${issue.page}`);

		// Add location
		if (issue.location) {
			descriptionParts.push(`Location: ${issue.location}`);
		}

		// Add description
		if (issue.description) {
			descriptionParts.push('');
			descriptionParts.push('Description:');
			descriptionParts.push(issue.description);
		}

		// Add notes/solutions
		if (issue.notes) {
			descriptionParts.push('');
			descriptionParts.push('Notes and Solutions:');
			descriptionParts.push(issue.notes);
		}

		// Map priority to Jira priority
		const jiraPriority = JiraService.mapPriorityToJira(issue.priority);

		return {
			projectKey,
			summary: `[A11y] ${issue.title}`,
			description: descriptionParts.join('\n'),
			issueType: 'Bug',
			priority: jiraPriority,
			labels: ['accessibility', 'wcag']
		};
	}

	/**
	 * Maps accessibility priority (1-3) to Jira priority names
	 */
	static mapPriorityToJira(priority: Priority): string {
		switch (priority) {
			case 3: // Blocker
				return 'Highest';
			case 2: // Medium
				return 'High';
			case 1: // Low
			default:
				return 'Medium';
		}
	}
}
