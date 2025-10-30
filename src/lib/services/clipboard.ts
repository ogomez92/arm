import type { Issue } from '../types';
import { wcagCriteria } from '../wcag-criteria';
import { getPriorityLabel } from '../utils/priority';
import { getWCAGCriterionTitle } from '../utils/wcag';

export class ClipboardService {
	static async copyIssue(issue: Issue, language: 'en' | 'es'): Promise<void> {
		const isSpanish = language === 'es';
		const criterion = wcagCriteria.find((c) => c.number === issue.criterionNumber);

		const pageLabel = isSpanish ? 'Página' : 'Page';
		const criterionLabel = isSpanish ? 'Criterio WCAG' : 'WCAG Criterion';
		const titleLabel = isSpanish ? 'Título' : 'Title';
		const priorityLabel = isSpanish ? 'Prioridad' : 'Priority';
		const descriptionLabel = isSpanish ? 'Descripción' : 'Description';
		const locationLabel = isSpanish ? 'Ubicación' : 'Location';
		const screenshotLabel = isSpanish ? 'Captura de Pantalla' : 'Screenshot';
		const notesLabel = isSpanish ? 'Notas y Soluciones' : 'Notes and Solutions';

		let text = `${titleLabel}: ${issue.title}\n\n`;
		text += `${priorityLabel}: ${getPriorityLabel(issue.priority, language)}\n\n`;
		text += `${pageLabel}: ${issue.page}\n\n`;
		text += `${criterionLabel}: ${criterion?.number} - ${getWCAGCriterionTitle(issue.criterionNumber, language)} (${criterion?.level})\n\n`;
		text += `${descriptionLabel}:\n${issue.description}\n\n`;
		text += `${locationLabel}: ${issue.location}\n\n`;

		if (issue.screenshot) {
			text += `${screenshotLabel}: ${issue.screenshot}\n\n`;
		}

		text += `${notesLabel}:\n${issue.notes}`;

		await navigator.clipboard.writeText(text);
	}
}
