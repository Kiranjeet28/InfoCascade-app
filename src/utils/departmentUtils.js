import { DEPARTMENT_OPTIONS } from '../constants/theme';

export async function fetchDepartments() {
  // Returns a list of department values, e.g. ['cse', 'it', 'ece']
  return DEPARTMENT_OPTIONS.map((opt) => opt.value);
}

// ...existing code...
export async function fetchGroups(department) {
  // Try fetching the static JSON path (works when dev server serves project files)
  try {
    const res = await fetch(`/web/group/${department}.json`);
    if (res.ok) return await res.json();
  } catch (e) {
    // ignore and fall back to bundler require
  }

  // Fallback: static require map (Metro-friendly — no dynamic require)
   
  const groupsMap = {
    appliedscience: require('../../web/group/appliedscience.json'),
    bca: require('../../web/group/bca.json'),
    civil: require('../../web/group/civil.json'),
    cse: require('../../web/group/cse.json'),
    ece: require('../../web/group/ece.json'),
    electrical: require('../../web/group/electrical.json'),
    it: require('../../web/group/it.json'),
    mechanical: require('../../web/group/mechanical.json'),
  };

  return groupsMap[department] || [];
}
// ...existing code...