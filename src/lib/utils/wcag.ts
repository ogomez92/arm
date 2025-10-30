import type { WCAGCriterion, Language } from '../types';
import { wcagCriteria } from '../wcag-criteria';

export function getWCAGCriterionTitle(number: string, language: Language): string {
	const criterion = wcagCriteria.find((c) => c.number === number);
	if (!criterion) return number;
	return language === 'es' ? criterion.titleEs : criterion.title;
}

export function getWCAGPrinciple(criterion: WCAGCriterion, language: Language): string {
	return language === 'es' ? criterion.principleEs : criterion.principle;
}

export function formatWCAGOption(criterion: WCAGCriterion, language: Language): string {
	const title = language === 'es' ? criterion.titleEs : criterion.title;
	return `${criterion.number} - ${title} (${criterion.level})`;
}
