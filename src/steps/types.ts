export type Step = 'intro' | 'manualId' | 'label' | 'confirm' | 'faces' | 'review' | 'notes' | 'share' | 'ocrTest';
export type Navigate = (step: Step) => void;
