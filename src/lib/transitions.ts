export const laneSwitch = {
  forwards: {
    old: [
      {
        name: 'laneStageOut',
        duration: '520ms',
        easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
        fillMode: 'both',
      },
    ],
    new: [
      {
        name: 'laneDetailIn',
        duration: '620ms',
        easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
        fillMode: 'both',
      },
    ],
  },
  backwards: {
    old: [
      {
        name: 'laneDetailOut',
        duration: '460ms',
        easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
        fillMode: 'both',
      },
    ],
    new: [
      {
        name: 'laneStageIn',
        duration: '560ms',
        easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
        fillMode: 'both',
      },
    ],
  },
};
