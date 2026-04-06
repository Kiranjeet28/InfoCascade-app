import { useEffect } from 'react';
import { useInAppNotifications } from '../context/in-app-notification-context';
import { ClassSlot } from '../types';

// Global tracking to ensure notifications show only once per class across all component instances
const notifiedClasses = new Set<string>();

/**
 * Hook to show notifications for current and next class
 * Displays notification when current class starts and when next class is up
 * Uses global tracking to ensure notifications show only once per class session
 */
export function useClassNotifications(current: ClassSlot | null, next: ClassSlot | null) {
    const { showNotification } = useInAppNotifications();

    // Helper function to extract class info
    const getClassInfo = (cls: ClassSlot | null) => {
        if (!cls) return null;

        const isProject = cls.data.subject === 'Minor Project' || cls.data.subject === 'Major Project';
        const isMandatory = cls.data.OtherDepartment === true && !isProject;

        const subject = cls.data.subject ?? cls.data.entries?.[0]?.subject ?? (isMandatory ? 'Mandatory Course' : 'Unknown');
        const room = cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? '';

        return { subject, room, time: cls.timeOfClass };
    };

    // Helper to create unique class identifier
    const getClassId = (cls: ClassSlot | null) => {
        if (!cls) return null;
        return `${cls.dayOfClass}-${cls.timeOfClass}-${cls.data.subject}`;
    };

    useEffect(() => {
        // Show notification for current class when it starts
        if (current) {
            const classId = getClassId(current);
            const classInfo = getClassInfo(current);

            if (classInfo && classId && !notifiedClasses.has(classId)) {
                showNotification({
                    title: '🔴 Class Started',
                    body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ''}`,
                    type: 'start',
                });
                notifiedClasses.add(classId);
            }
        }
    }, [current, showNotification]);

    useEffect(() => {
        // Show notification for next class (only if no current class)
        if (next && !current) {
            const classId = getClassId(next);
            const classInfo = getClassInfo(next);

            if (classInfo && classId && !notifiedClasses.has(classId)) {
                showNotification({
                    title: '📋 Up Next',
                    body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ''} at ${classInfo.time}`,
                    type: 'reminder',
                });
                notifiedClasses.add(classId);
            }
        }
    }, [next, current, showNotification]);

    // Cleanup: Clear notifications when day changes (next day)
    useEffect(() => {
        const checkDayChange = () => {
            const now = new Date();
            const dayId = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
            const lastDayId = sessionStorage.getItem('lastNotificationDayId');

            if (lastDayId !== dayId) {
                notifiedClasses.clear();
                sessionStorage.setItem('lastNotificationDayId', dayId);
            }
        };

        checkDayChange();
        const timer = setInterval(checkDayChange, 60000); // Check every minute

        return () => clearInterval(timer);
    }, []);
}
