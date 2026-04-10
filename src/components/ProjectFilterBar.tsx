import { Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DEFAULT_FILTER_QUERY, DueDateBucket, ProjectFilterQuery } from '../lib/projectFilters';
import { SavedView } from '../hooks/useSavedViews';
import Button from './Button';

interface FilterOptions {
  departments: string[];
  riskFactors: string[];
  owners: string[];
  ownerGroups: string[];
  tags: string[];
  priorities?: string[];
  statuses?: string[];
}

function MultiSelect({ id, label, values, options, onChange }: { id: string; label: string; values: string[]; options: string[]; onChange: (v: string[]) => void }) {
  const selectedCount = values.length;

  const toggleOption = (option: string) => {
    if (values.includes(option)) {
      onChange(values.filter(value => value !== option));
      return;
    }

    onChange([...values, option]);
  };

  return (
    <details className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant min-w-[180px] relative">
      <summary
        id={id}
        className="bg-surface-container-low border border-outline-variant/30 rounded-md px-3 py-2 text-xs cursor-pointer list-none flex items-center justify-between gap-2"
      >
        <span>{label}</span>
        <span className="text-on-surface-variant/80 font-normal">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Any'}
        </span>
      </summary>

      <div className="absolute top-full left-0 z-20 mt-1 w-64 max-h-56 overflow-auto bg-surface-container-low border border-outline-variant/30 rounded-md p-2 shadow-lg">
        {options.map(option => {
          const checked = values.includes(option);
          return (
            <label key={option} className="flex items-center gap-2 px-1 py-1 text-xs font-normal cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleOption(option)}
                className="h-3 w-3"
              />
              <span>{option}</span>
            </label>
          );
        })}
        {options.length === 0 ? (
          <p className="px-1 py-1 text-xs font-normal text-on-surface-variant/80">No options available.</p>
        ) : null}
      </div>
    </details>
  );
}

export default function ProjectFilterBar({
  query,
  onChange,
  onReset,
  options,
  savedViews,
  onSaveView,
  onApplySavedView,
  onDeleteSavedView,
}: {
  query: ProjectFilterQuery;
  onChange: (query: ProjectFilterQuery) => void;
  onReset: () => void;
  options: FilterOptions;
  savedViews: SavedView[];
  onSaveView: (name: string) => void;
  onApplySavedView: (viewId: string) => void;
  onDeleteSavedView: (viewId: string) => void;
}) {
  const [newViewName, setNewViewName] = useState('');
  const [selectedViewId, setSelectedViewId] = useState('');

  const dueDateOptions: { value: DueDateBucket; label: string }[] = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'this_week', label: 'Due This Week' },
    { value: 'next_30', label: 'Due in Next 30 Days' },
    { value: 'no_due_date', label: 'No Due Date' }
  ], []);

  return (
    <section className="bg-surface-container-low rounded-xl p-4 mb-6 border border-outline-variant/20">
      <div className="mb-4">
        <label htmlFor="project-filter-search" className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant max-w-lg">
          Search
          <input
            id="project-filter-search"
            type="search"
            value={query.searchTerm}
            onChange={(event) => onChange({ ...query, searchTerm: event.target.value })}
            placeholder="Search title, code, owner, department, tags..."
            className="bg-surface-container-low border border-outline-variant/30 rounded-md px-3 py-2 text-xs"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <MultiSelect id="project-filter-priority" label="Priority" values={query.priorities} options={options.priorities || ['High', 'Medium', 'Low']} onChange={(v) => onChange({ ...query, priorities: v as ProjectFilterQuery['priorities'] })} />
        <MultiSelect id="project-filter-status" label="Status" values={query.statuses} options={options.statuses || ['Intake / Proposed', 'Scoping', 'In Progress', 'Pilot / Testing', 'Review / Approval', 'Launched']} onChange={(v) => onChange({ ...query, statuses: v as ProjectFilterQuery['statuses'] })} />
        <MultiSelect id="project-filter-department" label="Department" values={query.departments} options={options.departments} onChange={(v) => onChange({ ...query, departments: v })} />
        <MultiSelect id="project-filter-risk" label="Risk" values={query.riskFactors} options={options.riskFactors} onChange={(v) => onChange({ ...query, riskFactors: v })} />
        <MultiSelect id="project-filter-owners" label="Owners" values={query.owners} options={options.owners} onChange={(v) => onChange({ ...query, owners: v })} />
        <MultiSelect id="project-filter-owner-groups" label="Owner Groups" values={query.ownerGroups} options={options.ownerGroups} onChange={(v) => onChange({ ...query, ownerGroups: v })} />
        <MultiSelect id="project-filter-tags-all" label="Tags (All)" values={query.tagsAll} options={options.tags} onChange={(v) => onChange({ ...query, tagsAll: v })} />
        <MultiSelect id="project-filter-tags-any" label="Tags (Any)" values={query.tagsAny} options={options.tags} onChange={(v) => onChange({ ...query, tagsAny: v })} />

        <label htmlFor="project-filter-due-date" className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant min-w-[160px]">
          Due Date
          <select
            id="project-filter-due-date"
            value={query.dueDateBucket}
            onChange={(event) => onChange({ ...query, dueDateBucket: event.target.value as DueDateBucket })}
            className="bg-surface-container-low border border-outline-variant/30 rounded-md p-2 text-xs"
          >
            {dueDateOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <Button variant="outline" size="sm" onClick={onReset}>Clear Filters</Button>
      </div>

      <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap gap-2 items-center">
        <label htmlFor="project-filter-save-view" className="sr-only">Save current view name</label>
        <input
          id="project-filter-save-view"
          value={newViewName}
          onChange={(e) => setNewViewName(e.target.value)}
          placeholder="Save current view as..."
          className="bg-surface-container-low border border-outline-variant/30 rounded-md px-3 py-2 text-xs min-w-[220px]"
        />
        <Button
          onClick={() => {
            onSaveView(newViewName);
            setNewViewName('');
          }}
          variant="primary"
          size="sm"
        >
          <Save className="w-3 h-3" /> Save View
        </Button>

        <label htmlFor="project-filter-load-view" className="sr-only">Load saved view</label>
        <select
          id="project-filter-load-view"
          value={selectedViewId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedViewId(id);
            if (id) onApplySavedView(id);
          }}
          className="bg-surface-container-low border border-outline-variant/30 rounded-md px-3 py-2 text-xs min-w-[200px]"
        >
          <option value="">Load saved view...</option>
          {savedViews.map(view => (
            <option key={view.id} value={view.id}>{view.name}</option>
          ))}
        </select>

        <Button
          onClick={() => selectedViewId && onDeleteSavedView(selectedViewId)}
          disabled={!selectedViewId}
          variant="outline"
          size="sm"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </Button>
      </div>
    </section>
  );
}

export { DEFAULT_FILTER_QUERY };
