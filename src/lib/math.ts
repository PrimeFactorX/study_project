import { differenceInDays } from 'date-fns';

export interface SlideDeck {
    id: string;
    name: string;
    total_pages: number;
    read_pages: number;
    is_completed: boolean;
}

export interface Assessment {
    id: string;
    name: string;
    type: 'exam' | 'quiz' | 'project';
    date: Date | null;
    weight: number;
    is_completed: boolean;
}

export interface Course {
    id: string;
    name: string;
    decks: SlideDeck[];
    // We can keep these for legacy/compatibility or remove them. 
    // They are computed dynamically based on the decks array now.
    total_items: number;
    finished_items: number;
    difficulty: number; // 1 to 10
    assessments: Assessment[];
    credits: number;
    target_grade: string;
    current_avg: number;
    status: 'active' | 'retake'; // New field for retake separation
    schedule_days?: number[]; // Array of weekdays 0-6 (0 = Sunday). Used for Pop Quiz preparation.
}

export const gradeToPoints: Record<string, number> = {
    'AA': 4.0,
    'BA+': 3.75,
    'BA': 3.5,
    'BB+': 3.25,
    'BB': 3.0,
    'CB+': 2.75,
    'CB': 2.5,
    'CC+': 2.25,
    'CC': 2.0,
    'DC+': 1.75,
    'DC': 1.5,
    'DD+': 1.25,
    'DD': 1.0,
    'FF': 0.0,
    'VF': 0.0,
};

export const pointsToGrade = (points: number): string => {
    if (points >= 3.875) return 'AA';
    if (points >= 3.625) return 'BA+';
    if (points >= 3.375) return 'BA';
    if (points >= 3.125) return 'BB+';
    if (points >= 2.875) return 'BB';
    if (points >= 2.625) return 'CB+';
    if (points >= 2.375) return 'CB';
    if (points >= 2.125) return 'CC+';
    if (points >= 1.875) return 'CC';
    if (points >= 1.625) return 'DC+';
    if (points >= 1.375) return 'DC';
    if (points >= 1.125) return 'DD+';
    if (points >= 0.875) return 'DD';
    return 'FF';
};

/**
 * Helper to compute total items dynamically.
 */
export function getCourseTotals(course: Course) {
    let total = 0;
    let finished = 0;

    if (course.decks && course.decks.length > 0) {
        course.decks.forEach(d => {
            total += d.total_pages;
            finished += d.is_completed ? d.total_pages : d.read_pages;
        });
    } else {
        // Legacy fallback
        total = course.total_items || 0;
        finished = course.finished_items || 0;
    }

    return { total, finished };
}

/**
 * Calculates Priority Score based on the formula:
 * P = ((Total Items - Finished Items) * Difficulty) / Days to Exam
 * If Days to Exam is 0 or negative, it returns a very high priority.
 */
export function calculatePriorityScore(course: Course): number {
    const { total, finished } = getCourseTotals(course);
    const itemsRemaining = Math.max(0, total - finished);

    if (itemsRemaining === 0) return 0; // Completed, no priority

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the closest upcoming assessment
    let closestAssessment: Assessment | null = null;
    let minDays = Infinity;

    if (course.assessments && course.assessments.length > 0) {
        course.assessments.forEach(assessment => {
            if (!assessment.is_completed) {
                if (assessment.date) {
                    const days = differenceInDays(new Date(assessment.date), today);
                    if (days >= 0 && days < minDays) {
                        minDays = days;
                        closestAssessment = assessment as Assessment;
                    }
                } else if (assessment.date === null) {
                    // Pop Quiz Dateless Logic
                    let daysUntilNextClass = 3; // Default pressure if days unknown

                    if (course.schedule_days && course.schedule_days.length > 0) {
                        const currentDay = today.getDay(); // 0-6

                        // Find the next scheduled day
                        const sortedDays = [...course.schedule_days].sort();
                        let nextDay = sortedDays.find(d => d >= currentDay);

                        if (nextDay !== undefined) {
                            daysUntilNextClass = nextDay - currentDay;
                        } else {
                            // Rolls over to next week
                            daysUntilNextClass = (7 - currentDay) + sortedDays[0];
                        }
                    }

                    if (daysUntilNextClass < minDays) {
                        minDays = daysUntilNextClass;
                        closestAssessment = assessment as Assessment;
                    }
                }
            }
        });
    }

    if (!closestAssessment) {
        // No date defined and no dateless assessments, default moderate score
        return (itemsRemaining * course.difficulty) / 14;
    }

    let daysToExam = minDays;

    if (daysToExam <= 0) {
        daysToExam = 0.5; // High priority penalty
    }

    const weightFactor = (closestAssessment as Assessment).weight > 0 ? ((closestAssessment as Assessment).weight / 100) + 1 : 1;

    return ((itemsRemaining * course.difficulty) / daysToExam) * weightFactor;
}

/**
 * Calculates current GPA simulation based on a mix of both new and retaking courses.
 * Retaking a course only modifies quality points by the difference between new and old grade.
 * New courses add direct quality points and increase the total baseline credits.
 */
export function simulateHybridGPA(
    baseGPA: number,
    baseCredits: number,
    courses: { credits: number; oldGrade: string; targetGrade: string; isRetake: boolean }[]
): number {
    if (baseCredits === 0 && courses.length === 0) return 0.0;

    let currentQualityPoints = baseGPA * baseCredits;
    let totalCredits = baseCredits;

    courses.forEach(c => {
        const newPoints = gradeToPoints[c.targetGrade] ?? 0;

        if (c.isRetake) {
            const oldPoints = gradeToPoints[c.oldGrade] ?? 0;
            const pointDifference = newPoints - oldPoints;
            if (pointDifference > 0) {
                currentQualityPoints += (c.credits * pointDifference);
            }
        } else {
            // New course: add to both points and credits
            currentQualityPoints += (c.credits * newPoints);
            totalCredits += c.credits;
        }
    });

    if (totalCredits === 0) return 0.0;
    return currentQualityPoints / totalCredits;
}
