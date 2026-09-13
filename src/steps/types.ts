export type Step = 'intro' | 'label' | 'confirm' | 'faces' | 'review' | 'notes' | 'share';
export type Navigate = (step: Step) => void;
