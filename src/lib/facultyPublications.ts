export const FACULTY_PUBLICATIONS_PATH = '/faculty-publications-ai';
export const FACULTY_PUBLICATIONS_URL = 'https://law.stanford.edu/publications/?related_organization=556083&page=1';

export function isFacultyPublicationsLink(label: string, url: string): boolean {
  if (label.trim().toLowerCase() === 'sls faculty publications on ai') return true;

  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsedUrl.hostname === 'law.stanford.edu'
      && parsedUrl.pathname.replace(/\/+$/, '') === '/publications'
      && parsedUrl.searchParams.get('related_organization') === '556083';
  } catch {
    return false;
  }
}
