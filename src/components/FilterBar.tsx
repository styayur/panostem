import { useSearchStore, visibleResults, type TypeFilter } from "../stores/searchStore";
import { RESULT_TYPES } from "../lib/types";
import { useT, typeLabelKey } from "../lib/i18n";
import { cn } from "../lib/cn";

export default function FilterBar() {
  const t = useT();
  const typeFilter = useSearchStore((s) => s.typeFilter);
  const setTypeFilter = useSearchStore((s) => s.setTypeFilter);
  const total = useSearchStore(() => visibleResults().length);

  const chips: Array<{ value: TypeFilter; label: string }> = [
    { value: "all", label: t("filter.all") },
    ...RESULT_TYPES.map((rt) => ({ value: rt as TypeFilter, label: t(typeLabelKey(rt)) })),
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-edge-light px-3 py-2 dark:border-edge-dark">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => setTypeFilter(chip.value)}
          aria-pressed={typeFilter === chip.value}
          className={cn(
            "whitespace-nowrap rounded border px-2.5 py-1 text-[11px] font-medium transition-colors",
            typeFilter === chip.value
              ? "border-accent/50 bg-accent/10 text-accent dark:text-accent"
              : "border-edge-light text-muted hover:bg-subtle dark:border-edge-dark dark:text-muted dark:hover:bg-subtle"
          )}
        >
          {chip.label}
        </button>
      ))}
      <span className="ml-auto shrink-0 text-[11px] text-muted">
        {t("filter.count", { n: total })}
      </span>
    </div>
  );
}
