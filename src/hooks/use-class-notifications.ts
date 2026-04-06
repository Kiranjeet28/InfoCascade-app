import { useEffect, useRef } from 'react';
import { useInAppNotifications } from '../context/in-app-notification-context';
import { ClassSlot } from '../types';

/**
 * Hook to show notifications for current and next class
 * Displays notification when current class starts and when next class is up
 */
export function useClassNotifications(current: ClassSlot | null, next: ClassSlot | null) {
    const { showNotification } = useInAppNotifications();
    const notifiedCurrentClassRef = useRef<string | null>(null);
    const notifiedNextClassRef = useRef<string | null>(null);

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

            if (classInfo && classId !== notifiedCurrentClassRef.current) {
                showNotification({
                    title: '🔴 Class Started',
                    body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ''}`,
                    type: 'start',
                });
                notifiedCurrentClassRef.current = classId;
            }
        }
    }, [current, showNotification]);

    useEffect(() => {
        // Show notification for next class
        if (next && !current) {
            const classId = getClassId(next);
            const classInfo = getClassInfo(next);

            if (classInfo && classId !== notifiedNextClassRef.current) {
                showNotification({
                    title: '📋 Up Next',
                    body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ''} at ${classInfo.time}`,
                    type: 'reminder',
                });
                notifiedNextClassRef.current = classId;
            }
        } else if (next && current) {
            // Reset next notification if we had a current class and it ends
            notifiedNextClassRef.current = null;
        }
    }, [next, current, showNotification]);
}
