/**
 * Language detection utility for multilingual story generation
 */

// Common words for language detection
const LANGUAGE_PATTERNS = {
    it: {
        common: ['il', 'la', 'di', 'che', 'un', 'una', 'per', 'con', 'sono', 'della', 'nel', 'dei', 'delle', 'gli', 'le', 'da', 'come', 'anche', 'più', 'essere'],
        score: 0
    },
    en: {
        common: ['the', 'is', 'are', 'of', 'and', 'to', 'in', 'that', 'have', 'for', 'with', 'on', 'be', 'this', 'from', 'by', 'at', 'or', 'as', 'was'],
        score: 0
    },
    es: {
        common: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'una', 'por', 'con', 'para', 'los', 'las', 'del', 'se', 'es', 'su', 'como', 'más', 'pero'],
        score: 0
    },
    fr: {
        common: ['le', 'la', 'de', 'et', 'un', 'une', 'à', 'dans', 'pour', 'que', 'les', 'des', 'du', 'ce', 'il', 'elle', 'est', 'avec', 'par', 'sur'],
        score: 0
    },
    de: {
        common: ['der', 'die', 'das', 'und', 'in', 'den', 'von', 'zu', 'mit', 'ein', 'eine', 'ist', 'des', 'sich', 'auf', 'für', 'dem', 'nicht', 'sie', 'auch'],
        score: 0
    }
};

export type SupportedLanguage = 'it' | 'en' | 'es' | 'fr' | 'de';

/**
 * Detects the language of a given text using word frequency analysis
 * @param text The text to analyze
 * @returns The detected language code
 */
export function detectLanguage(text: string): SupportedLanguage {
    if (!text || text.trim().length === 0) {
        return 'en'; // Default to English
    }

    // Normalize and split text into words
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 1); // Ignore single characters

    if (words.length === 0) {
        return 'en';
    }

    // Reset scores
    const scores: Record<SupportedLanguage, number> = {
        it: 0,
        en: 0,
        es: 0,
        fr: 0,
        de: 0
    };

    // Count matches for each language
    words.forEach(word => {
        Object.keys(LANGUAGE_PATTERNS).forEach(lang => {
            const langKey = lang as SupportedLanguage;
            if (LANGUAGE_PATTERNS[langKey].common.includes(word)) {
                scores[langKey]++;
            }
        });
    });

    // Find language with highest score
    let maxScore = 0;
    let detectedLang: SupportedLanguage = 'en';

    Object.entries(scores).forEach(([lang, score]) => {
        if (score > maxScore) {
            maxScore = score;
            detectedLang = lang as SupportedLanguage;
        }
    });

    // If no clear winner, default to English
    if (maxScore === 0) {
        return 'en';
    }

    return detectedLang;
}

/**
 * Gets the full name of a language from its code
 * @param code The language code
 * @returns The full language name
 */
export function getLanguageName(code: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
        'it': 'Italian',
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German'
    };
    return names[code] || 'English';
}

/**
 * Gets the native name of a language from its code
 * @param code The language code
 * @returns The native language name
 */
export function getLanguageNativeName(code: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
        'it': 'Italiano',
        'en': 'English',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch'
    };
    return names[code] || 'English';
}
