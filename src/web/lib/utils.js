/** Generate a random short ID for client-side use. */
export function uid() {
    return Math.random().toString(36).slice(2, 10);
}

/** Format seconds remaining as MM:SS. */
export function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Calculate points based on time remaining (faster = more points). */
export function calcPoints(timeLimit, timeRemaining) {
    if (timeLimit <= 0) return 100;
    const ratio = Math.max(0, timeRemaining / timeLimit);
    return Math.round(500 + 500 * ratio);
}
