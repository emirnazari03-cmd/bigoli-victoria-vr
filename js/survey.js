// BIGOLI VICTORIA — Ground Floor existing geometry.
// Source: assets/b378dcdb-...jpg, survey 0385-SY-01 (MJH, prelim, Apr 2022), 1:50.
// Digitised at 75.6 px/m; scale cross-checked against the written dimensions
// (clear 5.15 m, clear 3.12 m, 4.05 m, 6.43 m, 5.94 m) — all agree within ~20 mm.
//
// Plan coordinates, metres:
//   X = east,  measured from the inside face of the West unit's west wall
//   Z = north, measured from the inside face of the shopfront glazing line
//   Victoria Street is at Z < 0.
// Accuracy of digitising is roughly ±50 mm. Confirm by CAD take-off before
// anything is ordered or fabricated.

export const SURVEY = {
  ref: 'Survey 0385-SY-01 · Ground Floor · 1:50 · prelim Apr 2022',
  areas: { west: 20.32, east: 19.97, total: 43.6 }, // as stated on survey (exclude stair heads / low zones)

  west: {
    // interior outline, walls go outside this line
    outline: [[0, 0], [0, 4.84], [2.0, 4.30], [5.28, 5.13], [5.28, 0]],
    ceiling: 3.67,          // 3670 main
    ceilingFront: 3.55,     // 3550 at shopfront
    steelLintel: 0.37,      // "c.370 (steel lintel)"
    glazing: { x0: 0, x1: 4.37, head: 3.18 },
    door: { x0: 4.37, x1: 5.28, head: 2.145, hinge: 'east' }, // dh.2145, steps up from pavement
    chimneyBreast: { x0: 0, x1: 0.30, z0: 1.495, z1: 3.386, fireplace: { z0: 2.13, z1: 2.72, h: 0.92 } },
    stair: { // existing stair up, retained
      winder: [[4.15, 2.13], [5.28, 2.13], [5.28, 3.12], [4.47, 3.12]],
      flight: { x0: 4.47, x1: 5.28, z0: 3.12, z1: 5.13 },
      lowHeadroom: { x0: 3.61, x1: 4.47, z0: 4.14, z1: 5.13, h: 1.54, note: '1540–2480 under stair' },
    },
    elec: [{ x0: 0, x1: 0.17, z0: 0.66, z1: 1.12 }, { x0: 5.07, x1: 5.28, z0: 0.47, z1: 0.87 }],
  },

  partyWall: { x0: 5.28, x1: 5.70, door: { z0: 1.19, z1: 1.98, head: 1.99 } }, // dh.1990, only link between units

  east: {
    outline: [[5.70, 0], [5.70, 5.25], [9.47, 6.085], [9.76, 4.894], [9.76, 0]],
    ceiling: 3.625,
    ceilingFront: 3.64,
    glazing: { x0: 5.70, x1: 8.93, head: 3.55 }, // c.3654
    door: { x0: 8.93, x1: 9.76, head: 2.005, hinge: 'east' }, // dh.2005, steps up
    storeDoor: { z0: 5.07, z1: 5.75, head: 1.81 }, // dh.1810 in angled NE wall → under-stair store (1850)
    bulkheads: [
      { x0: 8.02, x1: 9.76, z0: 4.10, z1: 4.87, h: 2.355 },
      { x0: 8.02, x1: 9.50, z0: 4.87, z1: 6.10, h: 2.66 },
      { x0: 5.70, x1: 5.93, z0: 1.98, z1: 3.57, h: 2.195 }, // boxing along party wall
    ],
    elec: [{ x0: 5.70, x1: 5.82, z0: 0.34, z1: 0.94 }],
  },

  // Neighbouring upper-floor entrance lobby + stair (NOT in scope, shown for context only)
  lobby: { x0: 9.90, x1: 10.82, door: { x0: 9.98, x1: 10.74, head: 2.135 } },

  notes: [
    'Both entrance doors step up from the pavement.',
    'No WC on this floor.',
    '3.6 m concrete soffit carries extract ductwork; >3.1 m trading volume remains.',
    'West rear-left depth digitises at 4.84 m; the drawn 5.09 m dimension line runs ~0.25 m further. Survey query.',
    'The only link between units is the existing 790 mm door (dh.1990) in the party wall.',
  ],
};
