import { useEffect, useMemo, useState } from 'react';
import { ProjectFilterQuery } from '../lib/projectFilters';

export interface SavedView {
  id: string;
  name: string;
  query: ProjectFilterQuery;
  createdAt: string;
}

function storageKey(scope: string) {
  return `project-archives:saved-views:${scope}`;
}

export function useSavedViews(scope: string) {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as SavedView[];
      setViews(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to parse saved views', error);
    }
  }, [scope]);

  useEffect(() => {
    localStorage.setItem(storageKey(scope), JSON.stringify(views));
  }, [scope, views]);

  const api = useMemo(() => ({
    saveView: (name: string, query: ProjectFilterQuery) => {
      const cleanName = name.trim();
      if (!cleanName) return;
      setViews(prev => {
        const existing = prev.find(v => v.name.toLowerCase() === cleanName.toLowerCase());
        if (existing) {
          return prev.map(v => v.id === existing.id ? { ...v, query } : v);
        }
        return [{
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: cleanName,
          query,
          createdAt: new Date().toISOString()
        }, ...prev];
      });
    },
    deleteView: (id: string) => {
      setViews(prev => prev.filter(v => v.id !== id));
    }
  }), []);

  return { views, ...api };
}
