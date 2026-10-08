'use strict';
// Shared figure registry (public: no answers here). Marker ids are neutral (m1..m5); which structure each marker
// points at lives only in the private answer key. Coordinates are in the SVG's own viewBox units.
module.exports = {
  'female-repro': {
    src: 'assets/fig-female-repro.svg', w: 420, h: 380,
    alt: 'Simplified front-view diagram of the female reproductive system with five numbered markers.',
    desc: 'A pear-shaped uterus sits in the center. A fallopian tube curves out from each upper corner of the uterus toward an almond-shaped ovary on each side. The narrow lower end of the uterus is the cervix, which opens into the vagina, a tube leading downward. Marker 1 is above the uterus. Marker 2 is beside the ovary on the right side of the picture. Marker 3 is beside the vagina. Marker 4 is at the upper left near a fallopian tube. Marker 5 is beside the cervix.',
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
    desc: 'The bladder is at the top. Below it is the small round prostate gland. The urethra, a narrow tube, runs from the bladder through the prostate and along the length of the penis to its tip. In the sac below, an oval testis has a curved epididymis along its back. The vas deferens, a narrow tube, rises from the epididymis, loops up behind the bladder and joins the urethra at the prostate. A small seminal vesicle sits behind the bladder and is not marked. Marker 1 is at the lower left beside the testis. Marker 2 is at the lower right beside the epididymis. Marker 3 is at the right beside the vas deferens. Marker 4 is at the upper left beside the prostate gland. Marker 5 is at the far left beside the urethra inside the penis.',
    markers: [
      { id: 'm1', n: 1, x: 150, y: 300 },
      { id: 'm2', n: 2, x: 380, y: 304 },
      { id: 'm3', n: 3, x: 380, y: 190 },
      { id: 'm4', n: 4, x: 150, y: 112 },
      { id: 'm5', n: 5, x: 62, y: 168 }
    ]
  }
};
