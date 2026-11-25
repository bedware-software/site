// Open design questions the owner decides by looking at the live page.
// Each question renders all its options in development (a bar at the bottom switches
// them and builds an answer to copy); a production build keeps only `current`.
// When a question is decided: set `current`, then delete the other options and the question.

export interface Question { id: string; label: string; page: string; note?: string; current: string; options: Record<string, string> }

export const questions: Question[] = [];

export const question = (id: string) => questions.find((q) => q.id === id)!;
export const reviewing = import.meta.env.DEV;
