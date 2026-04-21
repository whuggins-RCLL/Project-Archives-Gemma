import React, { useEffect, useMemo, useState } from 'react';
import { Settings as SettingsIcon, Save, Bot, Key, Shield, Palette, Eye, Image as ImageIcon, ToggleLeft } from 'lucide-react';
import { api, Settings } from '../lib/api';
import { AI_PROVIDER_OPTIONS } from '../lib/uiDefaults';

const DEFAULT_SETTINGS: Settings = {
  aiEnabled: false,
  activeProvider: 'gemini',
  aiNextBestActionEnabled: true,
  aiRiskNarrativeEnabled: true,
  aiDuplicateDetectionEnabled: true,
  aiRequireHumanApproval: true,
  privacyMode: 'public-read',
  suiteName: 'AI Librarian Suite',
  portalName: 'Project Archives',
  logoDataUrl: '',
  primaryColor: '#002045',
  brandDarkColor: '#1A365D',
  darkPrimaryColor: '#aac7ff',
  darkBrandDarkColor: '#d6e3ff',
  customFooter: '',
  helpContactEmail: '',
  themeMode: 'system',
  heroMediaUrl: '',
  heroMediaType: 'none',
  showRefreshPermissions: true,
  showRoleDebug: false,
  showPortfolioActions: true,
};

type SectionId = 'identity' | 'theme' | 'hero' | 'ui' | 'privacy' | 'ai';

const SECTIONS: Array<{ id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'identity', label: 'Identity', icon: ImageIcon },
  { id: 'theme', label: 'Theme & colors', icon: Palette },
  { id: 'hero', label: 'Hero media', icon: Eye },
  { id: 'ui', label: 'Interface', icon: ToggleLeft },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'ai', label: 'AI features', icon: Bot },
];

export default function SettingsView({
  canManageSettings,
  canViewSettings,
  loadingRole,
  onRoleRefreshRequested,
  onSettingsUpdated,
}: {
  canManageSettings: boolean,
  canViewSettings: boolean,
  loadingRole: boolean,
  onRoleRefreshRequested?: () => Promise<void>,
  onSettingsUpdated?: (settings: Settings) => void,
}) {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<SectionId>('identity');
  const [bootstrapStatus, setBootstrapStatus] = useState<{ ownerCount: number; configured: boolean; eligible: boolean } | null>(null);
  const [claimingOwner, setClaimingOwner] = useState(false);

  const readOnly = !canManageSettings;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } catch (error) {
        console.error('Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, []);

  useEffect(() => {
    const fetchBootstrapStatus = async () => {
      try {
        const status = await api.getOwnerBootstrapStatus();
        setBootstrapStatus(status);
      } catch {
        setBootstrapStatus(null);
      }
    };

    void fetchBootstrapStatus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (readOnly) {
      setToast({ type: 'error', message: 'You have view-only access to settings.' });
      setSaving(false);
      return;
    }
    try {
      await api.updateSettings(settings);
      onSettingsUpdated?.(settings);
      setToast({ type: 'success', message: 'Settings saved successfully.' });
    } catch (error) {
      console.error('Failed to save settings');
      setToast({ type: 'error', message: error instanceof Error && error.message ? error.message : 'Failed to save settings. Ensure you have admin privileges.' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const claimOwnerAccess = async () => {
    setClaimingOwner(true);
    try {
      const result = await api.claimInitialOwnerAccess();
      setToast({ type: 'success', message: `${result.message} Refreshing claims...` });
      await api.refreshCurrentUserClaims(true);
      if (onRoleRefreshRequested) {
        await onRoleRefreshRequested();
      }
      setBootstrapStatus((prev) => ({ ownerCount: Math.max(prev?.ownerCount ?? 0, 1), configured: prev?.configured ?? true, eligible: false }));
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to claim owner access.' });
    } finally {
      setClaimingOwner(false);
    }
  };

  const toggle = (key: keyof Settings) => (value: boolean) => setSettings((prev) => ({ ...prev, [key]: value }));

  const sectionContent = useMemo(() => {
    switch (section) {
      case 'identity':
        return (
          <IdentitySection settings={settings} setSettings={setSettings} readOnly={readOnly} />
        );
      case 'theme':
        return (
          <ThemeSection settings={settings} setSettings={setSettings} readOnly={readOnly} />
        );
      case 'hero':
        return (
          <HeroSection settings={settings} setSettings={setSettings} readOnly={readOnly} />
        );
      case 'ui':
        return (
          <InterfaceSection settings={settings} toggle={toggle} readOnly={readOnly} />
        );
      case 'privacy':
        return (
          <PrivacySection settings={settings} setSettings={setSettings} readOnly={readOnly} />
        );
      case 'ai':
        return (
          <AISection settings={settings} setSettings={setSettings} toggle={toggle} readOnly={readOnly} />
        );
      default:
        return null;
    }
  }, [section, settings, readOnly]);

  if (loading || loadingRole) return <div className="p-10 text-on-surface-variant">Loading settings…</div>;

  if (!canViewSettings) {
    return (
      <div className="mx-auto max-w-3xl p-10 text-center">
        <Shield className="mx-auto mb-4 h-16 w-16 text-error" />
        <h2 className="mb-2 text-2xl font-bold">Access Denied</h2>
        <p className="text-on-surface-variant">You do not have permissions to view archive settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-10">
      {toast && (
        <div className="fixed right-6 top-6 z-50">
          <div className={`rounded-lg border px-4 py-3 text-sm font-bold shadow-lg ${
            toast.type === 'success'
              ? 'border-tertiary-fixed/30 bg-tertiary-container text-on-tertiary-container'
              : 'border-error/30 bg-error-container text-error'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      <header className="mb-8 flex items-center gap-3">
        <SettingsIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Workspace settings</h1>
          <p className="text-sm text-on-surface-variant">Identity, theme, hero media, and feature toggles for the suite.</p>
        </div>
      </header>

      {readOnly && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-on-surface-variant">
          You have read-only settings access. Owners and admins can edit and save changes.
        </div>
      )}

      {bootstrapStatus?.ownerCount === 0 && (
        <div className="mb-6 space-y-3 rounded-lg border border-tertiary-fixed/30 bg-tertiary-container/30 p-4 text-sm text-on-surface-variant">
          <p className="font-bold text-on-surface">First owner setup</p>
          {bootstrapStatus.configured ? (
            <p>No owner accounts are configured yet. If your email is listed in <code>OWNER_EMAILS</code>, you can claim owner access here.</p>
          ) : (
            <p>No owner accounts exist yet. Since <code>OWNER_EMAILS</code> is not configured, the first signed-in user can claim owner access here.</p>
          )}
          <button
            onClick={claimOwnerAccess}
            disabled={!bootstrapStatus.eligible || claimingOwner}
            className="rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {claimingOwner ? 'Claiming owner access…' : bootstrapStatus.eligible ? 'Claim owner access' : 'Owner claim unavailable'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[12rem_1fr]">
        <nav aria-label="Settings sections" className="md:sticky md:top-20 md:self-start">
          <ul className="flex gap-1 overflow-x-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1 md:flex-col md:gap-0.5 md:p-2">
            {SECTIONS.map((item) => {
              const isActive = section === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id} className="md:w-full">
                  <button
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
          <div className="space-y-6 p-6">{sectionContent}</div>
          <div className="flex justify-end gap-2 border-t border-outline-variant/15 bg-surface-container-low/50 p-4">
            <button
              onClick={handleSave}
              disabled={saving || readOnly}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : readOnly ? 'View only' : 'Save changes'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */

function FieldLabel({ id, children, hint }: { id: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {children}
      </label>
      {hint && <p className="mt-1 text-xs text-on-surface-variant/80">{hint}</p>}
    </div>
  );
}

function TextField({ id, value, onChange, disabled, placeholder, hint, label, maxLength }: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  label: string;
  maxLength?: number;
}) {
  return (
    <div>
      <FieldLabel id={id} hint={hint}>{label}</FieldLabel>
      <input
        id={id}
        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low p-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ColorField({ id, value, onChange, disabled, label, hint }: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <FieldLabel id={id} hint={hint}>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          className="h-10 w-12 cursor-pointer rounded border border-outline-variant/30 bg-transparent p-0.5 disabled:cursor-not-allowed"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          aria-label={`${label} hex value`}
          type="text"
          className="w-28 rounded-md border border-outline-variant/30 bg-surface-container-low p-2 font-mono text-xs uppercase text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          maxLength={7}
        />
      </div>
    </div>
  );
}

function Toggle({ id, label, description, checked, disabled, onChange }: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant/15 bg-surface-container-low/40 p-3">
      <div>
        <div className="text-sm font-semibold text-on-surface">{label}</div>
        <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>
      </div>
      <label htmlFor={id} className={`relative inline-flex shrink-0 cursor-pointer items-center ${disabled ? 'opacity-50' : ''}`}>
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <div className="h-6 w-11 rounded-full bg-surface-container-high peer-checked:bg-primary after:content-[''] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-outline-variant/40 after:bg-white after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
      </label>
    </div>
  );
}

function IdentitySection({ settings, setSettings, readOnly }: { settings: Settings; setSettings: (next: Settings) => void; readOnly: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Branding</h2>
        <p className="text-sm text-on-surface-variant">Names and the logo used everywhere in the suite.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          id="settings-portal-name"
          label="Primary name (organization)"
          hint="Shown as the main title in the sidebar, top bar, and public site."
          value={settings.portalName}
          maxLength={80}
          disabled={readOnly}
          placeholder="e.g. Library Technology and Innovation"
          onChange={(value) => setSettings({ ...settings, portalName: value })}
        />
        <TextField
          id="settings-suite-name"
          label="Product line (short)"
          hint="Smaller supporting label; avoid duplicating the organization title."
          value={settings.suiteName}
          maxLength={80}
          disabled={readOnly}
          placeholder="e.g. Project workspace"
          onChange={(value) => setSettings({ ...settings, suiteName: value })}
        />
      </div>

      <div>
        <FieldLabel id="settings-logo-upload" hint="PNG or SVG works best. Max ~150 KB. Used at small sizes; favor a square mark.">Identity logo</FieldLabel>
        <input
          id="settings-logo-upload"
          type="file"
          accept="image/*"
          disabled={readOnly}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const result = typeof reader.result === 'string' ? reader.result : '';
              setSettings({ ...settings, logoDataUrl: result });
            };
            reader.readAsDataURL(file);
          }}
        />
        {settings.logoDataUrl && (
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-outline-variant/30 bg-white">
              <img src={settings.logoDataUrl} alt="Brand logo preview" className="max-h-14 max-w-14 object-contain" />
            </div>
            <button
              onClick={() => setSettings({ ...settings, logoDataUrl: '' })}
              disabled={readOnly}
              className="text-xs font-bold text-error disabled:opacity-50"
            >
              Remove logo
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          id="settings-custom-footer"
          label="Custom footer"
          hint="Shown in the public portal footer. Leave blank to use the default."
          value={settings.customFooter ?? ''}
          maxLength={500}
          disabled={readOnly}
          placeholder="e.g. © My Organization. All rights reserved."
          onChange={(value) => setSettings({ ...settings, customFooter: value })}
        />
        <TextField
          id="settings-help-email"
          label="Help contact email"
          hint="Shown to users who need support. Leave blank to hide."
          value={settings.helpContactEmail ?? ''}
          maxLength={254}
          disabled={readOnly}
          placeholder="e.g. help@myorganization.org"
          onChange={(value) => setSettings({ ...settings, helpContactEmail: value })}
        />
      </div>
    </div>
  );
}

function ThemeSection({ settings, setSettings, readOnly }: { settings: Settings; setSettings: (next: Settings) => void; readOnly: boolean }) {
  const themeMode = settings.themeMode ?? 'system';
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Theme &amp; colors</h2>
        <p className="text-sm text-on-surface-variant">Choose the default color mode and pick brand colors for both modes.</p>
      </div>
      <div>
        <FieldLabel id="settings-theme-mode" hint="Users can override this from the top-bar theme switcher.">Default theme</FieldLabel>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {(['system', 'light', 'dark'] as const).map((option) => {
            const active = themeMode === option;
            return (
              <button
                key={option}
                type="button"
                disabled={readOnly}
                onClick={() => setSettings({ ...settings, themeMode: option })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ColorField
          id="settings-primary-color"
          label="Light · Primary"
          hint="Main brand color used for buttons and accents in light mode."
          value={settings.primaryColor}
          disabled={readOnly}
          onChange={(value) => setSettings({ ...settings, primaryColor: value })}
        />
        <ColorField
          id="settings-brand-dark-color"
          label="Light · Headline"
          hint="Used for page headlines and dark hero backgrounds in light mode."
          value={settings.brandDarkColor}
          disabled={readOnly}
          onChange={(value) => setSettings({ ...settings, brandDarkColor: value })}
        />
        <ColorField
          id="settings-dark-primary-color"
          label="Dark · Primary"
          hint="Used in dark mode. Pick a lighter, accessible variant of your brand color."
          value={settings.darkPrimaryColor ?? '#aac7ff'}
          disabled={readOnly}
          onChange={(value) => setSettings({ ...settings, darkPrimaryColor: value })}
        />
        <ColorField
          id="settings-dark-brand-dark-color"
          label="Dark · Headline"
          hint="Used for headlines on dark backgrounds in dark mode."
          value={settings.darkBrandDarkColor ?? '#d6e3ff'}
          disabled={readOnly}
          onChange={(value) => setSettings({ ...settings, darkBrandDarkColor: value })}
        />
      </div>

      <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Live preview</p>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white">Primary button</span>
          <span className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Soft accent</span>
          <span className="rounded-md bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white">Headline / hero</span>
        </div>
      </div>
    </div>
  );
}

function HeroSection({ settings, setSettings, readOnly }: { settings: Settings; setSettings: (next: Settings) => void; readOnly: boolean }) {
  const heroType = settings.heroMediaType ?? 'none';
  const heroUrl = settings.heroMediaUrl ?? '';
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Hero media</h2>
        <p className="text-sm text-on-surface-variant">
          Optional image or video shown behind the public hero section. Videos play silently and looped, with playback controls disabled.
        </p>
      </div>
      <div>
        <FieldLabel id="settings-hero-type">Hero media type</FieldLabel>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {(['none', 'image', 'video'] as const).map((option) => {
            const active = heroType === option;
            return (
              <button
                key={option}
                type="button"
                disabled={readOnly}
                onClick={() => setSettings({ ...settings, heroMediaType: option })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <TextField
        id="settings-hero-url"
        label="Hero media URL"
        hint="Use an https URL to a JPG, PNG, WebP, or MP4 file you host or embed."
        value={heroUrl}
        disabled={readOnly || heroType === 'none'}
        placeholder="https://cdn.example.org/hero.mp4"
        maxLength={2048}
        onChange={(value) => setSettings({ ...settings, heroMediaUrl: value })}
      />
      {heroType !== 'none' && heroUrl && (
        <div className="overflow-hidden rounded-lg border border-outline-variant/20 bg-brand-dark">
          {heroType === 'video' ? (
            <video
              className="h-48 w-full object-cover"
              src={heroUrl}
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              aria-hidden
            />
          ) : (
            <img className="h-48 w-full object-cover" src={heroUrl} alt="Hero preview" />
          )}
        </div>
      )}
    </div>
  );
}

function InterfaceSection({ settings, toggle, readOnly }: {
  settings: Settings;
  toggle: (key: keyof Settings) => (value: boolean) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Interface</h2>
        <p className="text-sm text-on-surface-variant">Hide or show optional UI affordances to reduce visual noise.</p>
      </div>
      <div className="space-y-3">
        <Toggle
          id="settings-show-refresh"
          label="Show 'Refresh permissions' button"
          description="Top-bar shortcut to re-fetch Firebase claims for this session."
          checked={settings.showRefreshPermissions !== false}
          disabled={readOnly}
          onChange={toggle('showRefreshPermissions')}
        />
        <Toggle
          id="settings-show-role-debug"
          label="Show role-source debug text"
          description="Adds a 'Token / Mirror' line under the user name and a mismatch banner in Access Management."
          checked={settings.showRoleDebug === true}
          disabled={readOnly}
          onChange={toggle('showRoleDebug')}
        />
        <Toggle
          id="settings-show-portfolio-actions"
          label="Show portfolio action bar"
          description="Refresh data, exports, recompute, sync, and ops digest controls on the Portfolio Overview page."
          checked={settings.showPortfolioActions !== false}
          disabled={readOnly}
          onChange={toggle('showPortfolioActions')}
        />
      </div>
    </div>
  );
}

function PrivacySection({ settings, setSettings, readOnly }: { settings: Settings; setSettings: (next: Settings) => void; readOnly: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Privacy</h2>
        <p className="text-sm text-on-surface-variant">Decide who can read project portfolio metadata in the public portal.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { id: 'public-read', name: 'Public read', desc: 'Anyone can read project portfolio metadata.' },
          { id: 'private-read', name: 'Private read (org)', desc: 'Only authenticated organizational users can read projects.' },
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            disabled={readOnly}
            onClick={() => setSettings({ ...settings, privacyMode: mode.id as Settings['privacyMode'] })}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              settings.privacyMode === mode.id
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant/20 hover:border-primary/30'
            } ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}
          >
            <div className="text-sm font-bold text-on-surface">{mode.name}</div>
            <div className="mt-1 text-xs text-on-surface-variant">{mode.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AISection({ settings, setSettings, toggle, readOnly }: {
  settings: Settings;
  setSettings: (next: Settings) => void;
  toggle: (key: keyof Settings) => (value: boolean) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-on-surface">AI features</h2>
        <p className="text-sm text-on-surface-variant">Enable assistive features and pick which provider powers them.</p>
      </div>

      <Toggle
        id="settings-ai-enabled"
        label="Enable AI features"
        description="Turn on AI summaries, next-best actions, risk drafts, and duplicate detection."
        checked={settings.aiEnabled}
        disabled={readOnly}
        onChange={toggle('aiEnabled')}
      />

      <div className={`transition-opacity ${settings.aiEnabled ? 'opacity-100' : 'pointer-events-none opacity-50'} ${readOnly ? 'pointer-events-none' : ''}`}>
        <h3 className="mb-3 font-bold text-on-surface">Active AI provider</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AI_PROVIDER_OPTIONS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={readOnly}
              onClick={() => setSettings({ ...settings, activeProvider: provider.id })}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                settings.activeProvider === provider.id
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant/20 hover:border-primary/30'
              } ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}
            >
              <div className="text-sm font-bold text-on-surface">{provider.name}</div>
              <div className="mt-1 text-xs text-on-surface-variant">{provider.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-3 transition-opacity ${settings.aiEnabled ? 'opacity-100' : 'pointer-events-none opacity-50'} ${readOnly ? 'pointer-events-none' : ''}`}>
        <h3 className="font-bold text-on-surface">Workflow capabilities</h3>
        {[
          { settingKey: 'aiNextBestActionEnabled' as const, title: 'Next-best action suggestions', desc: 'Generate prioritized recommendations for project owners.' },
          { settingKey: 'aiRiskNarrativeEnabled' as const, title: 'Risk narrative drafts', desc: 'Draft board-ready risk narratives with mitigations.' },
          { settingKey: 'aiDuplicateDetectionEnabled' as const, title: 'Duplicate-project detection', desc: 'Surface overlap candidates before duplicate work begins.' },
          { settingKey: 'aiRequireHumanApproval' as const, title: 'Human approval required', desc: 'AI outputs stay in pending state until explicitly approved.' },
        ].map((feature) => (
          <React.Fragment key={feature.settingKey}>
            <Toggle
              id={`settings-${feature.settingKey}`}
              label={feature.title}
              description={feature.desc}
              checked={settings[feature.settingKey] as boolean}
              disabled={readOnly}
              onChange={toggle(feature.settingKey)}
            />
          </React.Fragment>
        ))}
      </div>

      <div className="flex gap-3 rounded-lg border border-tertiary-fixed-dim/30 bg-tertiary-container/30 p-4">
        <Key className="mt-0.5 h-5 w-5 shrink-0 text-tertiary-fixed" />
        <div className="text-sm text-on-surface-variant">
          <strong className="mb-1 block text-on-surface">API key configuration</strong>
          To use these providers, configure the corresponding API keys in the server environment variables (<code>.env</code>). Keys are handled server-side and never exposed to the client.
        </div>
      </div>
    </div>
  );
}
