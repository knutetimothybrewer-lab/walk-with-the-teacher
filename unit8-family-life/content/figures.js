'use strict';
// Shared figure registry (public: no answers here). Marker ids are neutral (m1..m5); which structure each marker
// points at lives only in the private answer key. The text descriptions describe SHAPES and POSITIONS only: they must never
// name a structure that is one of the labels (the builder and tests/unit/content.test.js fail if they do). Coordinates are in the SVG's own viewBox units.
module.exports = {
  'female-repro': {
    src: 'assets/fig-female-repro.svg', w: 420, h: 380,
    alt: 'Simplified front-view diagram of the female reproductive system with five numbered markers.',
    desc: 'A simplified front view. In the center is a pear-shaped, muscular organ with a narrow neck at its lower end. A curved tube leaves each upper corner of that organ and reaches toward a small, almond-shaped organ on each side. Below the narrow neck, a tube leads downward. Marker 1 is above the pear-shaped organ. Marker 2 is beside the almond-shaped organ on the right side of the picture. Marker 3 is beside the tube that leads downward. Marker 4 is at the upper left, near one of the curved tubes. Marker 5 is beside the narrow neck.',
    markers: [
      { id: 'm1', n: 1, x: 210, y: 52 },
      { id: 'm2', n: 2, x: 375, y: 212 },
      { id: 'm3', n: 3, x: 268, y: 300 },
      { id: 'm4', n: 4, x: 44, y: 84 },
      { id: 'm5', n: 5, x: 268, y: 242 }
    ]
  },
  'male-repro': {
    src: 'assets/fig-male-repro.svg', w: 420, h: 380,
    alt: 'Simplified side-view cross-section of the male reproductive system with five numbered markers.',
    desc: 'A simplified side-view cross-section. A rounded sac sits at the top. Below it is a small, round gland. A narrow tube runs from the sac through the round gland and along the length of the long outer organ to its tip. In the pouch below, a large oval organ has a coiled tube resting along its back. A second narrow tube rises from the coiled tube, loops up behind the sac, and joins the first tube at the round gland. A small gland behind the sac is not marked. Marker 1 is at the lower left, beside the large oval organ. Marker 2 is at the lower right, beside the coiled tube. Marker 3 is at the right, beside the narrow tube that rises from the coiled tube. Marker 4 is at the upper left, beside the small round gland. Marker 5 is at the far left, beside the tube inside the long outer organ.',
    markers: [
      { id: 'm1', n: 1, x: 150, y: 300 },
      { id: 'm2', n: 2, x: 380, y: 304 },
      { id: 'm3', n: 3, x: 380, y: 190 },
      { id: 'm4', n: 4, x: 150, y: 112 },
      { id: 'm5', n: 5, x: 62, y: 168 }
    ]
  }
};
