import type { Priority } from '../types';
import type { Language } from '../types';

export function getPriorityLabel(priority: Priority, language: Language): string {
	const labels = {
		en: {
			1: 'Low',
			2: 'Medium',
			3: 'Blocker'
		},
		es: {
			1: 'Baja',
			2: 'Media',
			3: 'Bloqueante'
		}
	};

	return labels[language][priority];
}
