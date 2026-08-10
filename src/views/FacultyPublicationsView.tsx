import { ArrowLeft, ExternalLink, FolderArchive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../config';
import ThemeToggle from '../components/ThemeToggle';
import { useBranding } from '../hooks/useBranding';
import { FACULTY_PUBLICATIONS_URL } from '../lib/facultyPublications';

export default function FacultyPublicationsView() {
  const { branding } = useBranding();
  const portalName = branding.portalName || APP_CONFIG.portalName;

  return (
    <div className="min-h-screen app-canvas font-body flex flex-col">
      <a href="#publications-frame" className="skip-link">Skip to publications</a>
      <header className="glass-nav sticky top-0 z-30 border-b border-outline-variant/20">
        <div className="content-shell min-h-16 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={portalName} className="shrink-0 h-10 w-auto max-w-[200px] object-contain object-left" />
            ) : (
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-dark shadow-md">
                <FolderArchive className="text-white w-5 h-5" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-on-surface-variant truncate">{portalName}</p>
              <h1 className="font-headline text-base sm:text-lg font-bold text-brand-dark leading-tight truncate">
                SLS Faculty Publications on AI
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-lowest/70 px-3 sm:px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Back to homepage</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="content-shell w-full flex-1 py-5 sm:py-7 flex flex-col" aria-labelledby="publications-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="publications-heading" className="font-headline text-xl sm:text-2xl font-bold text-brand-dark">
              Faculty research and publications
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Browse the Stanford Law School publications list without leaving the project archive.
            </p>
          </div>
          <a
            href={FACULTY_PUBLICATIONS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            Open directly on Stanford Law School
            <ExternalLink className="w-4 h-4" aria-hidden />
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>

        <div className="glass-card overflow-hidden flex-1 min-h-[70vh]">
          <iframe
            id="publications-frame"
            src={FACULTY_PUBLICATIONS_URL}
            title="Stanford Law School faculty publications on artificial intelligence"
            className="block w-full h-[calc(100vh-13rem)] min-h-[70vh] bg-white"
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </main>
    </div>
  );
}
