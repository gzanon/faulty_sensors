export type Step = 'intro' | 'manualId' | 'label' | 'confirm' | 'faces' | 'review' | 'notes' | 'share' | 'queue';
export type Navigate = (step: Step) => void;
