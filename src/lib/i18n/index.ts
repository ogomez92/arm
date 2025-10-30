import { writable, derived } from 'svelte/store';
import type { Language } from '../types';
import { translations, type TranslationKey } from './translations';

const storedLanguage = (typeof localStorage !== 'undefined'
	? localStorage.getItem('language')
	: null) as Language | null;

export const currentLanguage = writable<Language>(storedLanguage || 'en');

currentLanguage.subscribe((lang) => {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('language', lang);
	}
	if (typeof document !== 'undefined') {
		document.documentElement.lang = lang;
	}
});

export const t = derived(currentLanguage, ($currentLanguage) => {
	return (key: TranslationKey): string => {
		return translations[$currentLanguage][key] || translations.en[key] || key;
	};
});

export function setLanguage(lang: Language): void {
	currentLanguage.set(lang);
}
