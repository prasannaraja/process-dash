export function getDatesInWeek(yearWeek: string): string[] {
    const [yearStr, weekStr] = yearWeek.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    // Simple ISO week logic: Monday of week 1 is the Monday of the first week with a Thursday
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(ISOweekStart);
        d.setDate(d.getDate() + i);
        // Format YYYY-MM-DD
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
    }
    return dates;
}

export function getCurrentWeek(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    var week1 = new Date(d.getFullYear(), 0, 4);
    var week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
