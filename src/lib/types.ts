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
}

export interface Report {
	id: string;
	name: string;
	pages: string[];
	issues: Issue[];
	createdAt: string;
	updatedAt: string;
}

export type Language = 'en' | 'es';
