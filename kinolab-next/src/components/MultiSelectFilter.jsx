import { useEffect, useRef, useState } from "react";

const copy = {
  hy: {
    apply: "Կիրառել", cancel: "Չեղարկել", clear: "Մաքրել", selectAll: "Ընտրել բոլորը",
    search: "Որոնել տարբերակներում…", selected: "ընտրված", none: "Տարբերակներ չեն գտնվել",
  },
  ru: {
    apply: "Применить", cancel: "Отмена", clear: "Сбросить", selectAll: "Выбрать все",
    search: "Поиск вариантов…", selected: "выбрано", none: "Варианты не найдены",
  },
  en: {
    apply: "Apply", cancel: "Cancel", clear: "Clear", selectAll: "Select all",
    search: "Search options…", selected: "selected", none: "No matching options",
  },
};

/**
 * Checked choices are a draft until Apply. Cancel, Escape or clicking outside
 * discard the draft. The parent owns applied choices and the real catalog filter.
 */
export default function MultiSelectFilter({
  id,
  title,
  allLabel,
  options,
  value,
  onApply,
  language = "en",
}) {
  const strings = copy[language] || copy.en;
  const root = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState("");
  const selected = Array.isArray(value) ? value : [];
  const allValues = options.map(option => option.value);
  const allChecked = allValues.length > 0 && allValues.every(value => draft.includes(value));
  const visible = options.filter(option =>
    String(option.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  function close() {
    setOpen(false);
    setDraft(selected);
    setQuery("");
  }
  function toggle() {
    if (open) {
      close();
    } else {
      setDraft(selected);
      setQuery("");
      setOpen(true);
    }
  }
  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!root.current?.contains(event.target)) close();
    }
    function keydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        root.current?.querySelector(".multi-filter-trigger")?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
    };
  }, [open, selected]);
  function selectAll(checked) {
    setDraft(checked ? [...new Set(allValues)] : []);
  }
  function choose(key, checked) {
    setDraft(previous =>
      checked ? [...previous.filter(item => item !== key), key] :
        previous.filter(item => item !== key),
    );
  }
  function apply() {
    onApply([...new Set(draft)]);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={"genre-multi" + (open ? " is-open" : "")} ref={root}>
      <button type="button" id={id + "Trigger"} className="multi-filter-trigger"
        aria-expanded={open} aria-controls={id + "Panel"} aria-haspopup="true"
        onClick={toggle}>
        <span>{title}</span>
        {selected.length > 0 && <span className="multi-filter-count">{selected.length}</span>}
        <span className="multi-filter-chevron" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div id={id + "Panel"} className="multi-filter-panel"
          role="group" aria-label={title}>
          <div className="multi-filter-panel-head">
            <strong>{selected.length ? title + " • " + selected.length + " " + strings.selected : allLabel}</strong>
          </div>
          <input type="search" className="multi-filter-search" value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={strings.search}
            aria-label={title + ": " + strings.search} />
          <label className="multi-filter-select-all">
            <input type="checkbox" checked={allChecked} disabled={!allValues.length}
              onChange={event => selectAll(event.target.checked)}
              aria-label={strings.selectAll} />
            <span>{strings.selectAll}</span>
          </label>
          <div className="multi-filter-options">
            {visible.map(option => (
              <label key={option.value} className="multi-filter-option">
                <input type="checkbox"
                  checked={draft.includes(option.value)}
                  onChange={event => choose(option.value, event.target.checked)}
                  aria-label={String(option.label)} />
                <span>{option.label}</span>
              </label>
            ))}
            {!visible.length && <p className="multi-filter-empty">{strings.none}</p>}
          </div>
          <div className="multi-filter-actions">
            <button type="button" className="multi-filter-apply" onClick={apply}>{strings.apply}</button>
            <button type="button" className="multi-filter-cancel" onClick={close}>{strings.cancel}</button>
            <button type="button" className="multi-filter-clear"
              onClick={() => setDraft([])}>{strings.clear}</button>
          </div>
        </div>
      )}
    </div>
  );
}
