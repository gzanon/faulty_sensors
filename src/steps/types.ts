export type Step = 'intro' | 'manualId' | 'label' | 'confirm' | 'faces' | 'review' | 'notes' | 'share' | 'settingsSharePoint';
export type Navigate = (step: Step) => void;
