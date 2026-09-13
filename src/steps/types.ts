export type Step = 'intro' | 'manualId' | 'label' | 'confirm' | 'faces' | 'review' | 'notes' | 'share';
export type Navigate = (step: Step) => void;
