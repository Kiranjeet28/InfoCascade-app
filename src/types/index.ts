// ─── Profile Types ────────────────────────────────────────────────────────────
export interface Profile {
    name: string;
    department: string;
    group: string;
}

export interface DepartmentOption {
    label: string;
    value: string;
    emoji: string;
}

// ─── Timetable Types ──────────────────────────────────────────────────────────
export interface ClassEntry {
    subject: string;
    teacher: string;
    classRoom: string;
}

export interface ClassData {
    subject?: string;
    teacher?: string;
    classRoom?: string;
    freeClass?: boolean;
    Lab?: boolean;
    Tut?: boolean;
    elective?: boolean;
    OtherDepartment?: boolean;
    entries?: ClassEntry[];
}

export interface ClassSlot {
    dayOfClass: string;
    timeOfClass: string;
    data: ClassData;
}

export interface GroupTimetable {
    classes: ClassSlot[];
}

export interface TimetableJson {
    timetable: Record<string, GroupTimetable>;
}

export type ClassTypeKey = 'Lab' | 'Tut' | 'elective' | 'project' | null;

export type ThemeMode = 'dark' | 'light' | 'system';