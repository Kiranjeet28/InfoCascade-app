import { DEPARTMENT_OPTIONS } from '../constants/theme';

export async function fetchDepartments() {
  // Returns a list of department values, e.g. ['cse', 'it', 'ece']
  return DEPARTMENT_OPTIONS.map((opt) => opt.value);
}

// ...existing code...
export async function fetchGroups(department) {
  // Fetch from GitHub repository
  const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/Kiranjeet28/infocascade-data/main/web/group';
  try {
    const res = await fetch(`${GITHUB_RAW_URL}/${department}.json`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`Failed to fetch groups from GitHub for ${department}:`, e.message);
  }

  // Fallback: return empty array
  console.warn(`No groups available for department: ${department}`);
  return [];
}
// ...existing code...