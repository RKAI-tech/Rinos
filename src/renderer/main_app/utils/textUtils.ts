/**
 * Truncates text to a maximum length, adding '...' if the text is longer.
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text with '...' if longer than maxLength
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '';
    const textStr = String(text);
    if (textStr.length <= maxLength) return textStr;
    return textStr.substring(0, maxLength) + '...';
};