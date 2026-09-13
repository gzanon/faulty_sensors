export type Step = 'intro' | 'label' | 'confirm' | 'faces' | 'review' | 'share';
export type Navigate = (step: Step) => void;
