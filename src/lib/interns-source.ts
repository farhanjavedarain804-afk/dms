// Shared reader for interns stored by /interns module.
// Lets other modules (Projects, Tasks, Attendance) offer interns
// alongside employees in dropdowns.

export type InternLite = {
  id: string;
  intern_code?: string;
  name: string;
  department?: string;
  status?: string;
  position?: string;
};

const KEY = "devionic.interns.v1";

export function loadInterns(): InternLite[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** Interns that should appear as selectable people in other modules. */
export function activeInterns(): InternLite[] {
  return loadInterns().filter(
    (i) => i.status === "Active" || i.status === "Applied",
  );
}

/** Options for select/multiselect fields that key by name. */
export function internNameOptions() {
  return activeInterns().map((i) => ({
    value: i.name,
    label: `${i.name} (Intern${i.intern_code ? ` · ${i.intern_code}` : ""})`,
  }));
}

/** Options for select fields that key by id (e.g. attendance). */
export function internIdOptions() {
  return activeInterns().map((i) => ({
    value: `intern:${i.id}`,
    label: `${i.name}${i.intern_code ? ` (${i.intern_code})` : ""} — Intern`,
  }));
}

export function useInternsTick() {
  // simple version counter based on storage events for reactivity
  if (typeof window === "undefined") return 0;
  return 0;
}
