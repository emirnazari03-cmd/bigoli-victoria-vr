// BIGOLI VICTORIA — Phase 1 layouts (Ground Floor only).
// Plan coordinates as survey.js: X east (m) from the West unit's west wall,
// Z north (m) from the shopfront glazing. Victoria Street is Z < 0.
//
// FIXED FOR BOTH OPTIONS (brief §14):
//   Customer ENTRANCE = West door (left of shopfront)
//   Customer EXIT     = East door (right of shopfront)
//   Collection point  = immediately to the customer's RIGHT of the POS
//
// Every element is one entry below: a plan footprint {x0,x1,z0,z1} plus `face`,
// the direction its working/customer front faces (N/S/E/W). To move something,
// change its numbers; the 3D scene, collisions, labels and minimap follow.
//
// Equipment envelopes are real commercial kit classes, to be confirmed against
// the chosen models / supplier drawings:
//   extruder  benchtop mixer-extruder (La Monferrina Dolly / Italgi Carlotta / Arcobaleno AEX18 class)
//   rack      mobile tray trolley, 10 × 600×400 trays
//   boiler    electric pasta cooker with automatic basket lift, 700 series
//   hob       2-zone induction range on cabinet
//   bain      heated sauce well, GN 1/6 pots
//   saladette refrigerated prep counter
//   kiosk     floor-standing self-order kiosk, 32″ portrait touchscreen + card terminal

export const STEPS = [
  { n: 1, key: 'extruder', name: 'Fresh pasta machine' },
  { n: 2, key: 'rack', name: 'Drying / holding rack' },
  { n: 3, key: 'boiler', name: 'Pasta boiler (auto-lift)' },
  { n: 4, key: 'hob', name: 'Sauce · pan finishing' },
  { n: 5, key: 'plating', name: 'Plating' },
  { n: 6, key: 'collect', name: 'Collection' },
];

// ------------------------------------------------------------------ OPTION A
const A = {
  id: 'A',
  name: 'Option A: operation West (left)',
  summary: 'Pasta window, kitchen and counter in the West unit, at the entrance. Dining in the East unit, beside the exit.',
  journey: 'Enter left → order lane (or self-order kiosk in dining) → POS → collect (right of POS) → party-wall door → dining → exit right.',
  seats: 16,
  opsUnit: 'W',
  items: [
    // 1 fresh pasta — at the West glazing
    { type: 'pastaBench', x0: 0.30, x1: 2.25, z0: 0.12, z1: 0.82, face: 'N' },
    { type: 'extruder', x0: 0.42, x1: 0.95, z0: 0.18, z1: 0.76, face: 'E', step: 1 },
    { type: 'traySet', x0: 1.00, x1: 1.62, z0: 0.20, z1: 0.74 },
    { type: 'board', x0: 1.68, x1: 2.20, z0: 0.20, z1: 0.74 },
    { type: 'rack', x0: 0.38, x1: 0.92, z0: 0.95, z1: 1.52, face: 'E', step: 2 },
    // 2 cook line along the chimney breast, under one canopy
    { type: 'boiler', x0: 0.30, x1: 1.05, z0: 1.55, z1: 2.25, face: 'E', step: 3 },
    { type: 'hob', x0: 0.30, x1: 1.05, z0: 2.25, z1: 2.95, face: 'E', step: 4 },
    { type: 'bain', x0: 0.30, x1: 1.05, z0: 2.95, z1: 3.55, face: 'E' },
    { type: 'saladette', x0: 0.30, x1: 1.05, z0: 3.55, z1: 4.25, face: 'E' },
    { type: 'filler', x0: 0.00, x1: 0.30, z0: 3.39, z1: 4.25 },
    { type: 'canopy', x0: 0.22, x1: 1.35, z0: 1.50, z1: 3.60, wall: 'W' },
    // 3 service counter facing the customer lane (customer faces west: right = north)
    // one continuous counter from the glazing to the collection wall (v3: no gate, no drinks cooler)
    { type: 'counter', x0: 2.35, x1: 3.05, z0: 0.15, z1: 2.80, face: 'E', step: 6,
      zones: { display: [0.35, 1.15], pos: [1.30, 1.80], collect: [1.95, 2.76] } },
    { type: 'menuScreens', x0: 2.62, x1: 2.74, z0: 0.60, z1: 2.40, face: 'E', screens: [4, 0, 1] },
    { type: 'collectWall', x0: 2.35, x1: 3.55, z0: 2.80, z1: 2.92, face: 'S', label: 'Collection wall with order-status TV' },
    // back of house
    { type: 'potwash', x0: 1.10, x1: 2.35, z0: 3.85, z1: 4.30, face: 'S' },
    { type: 'fridge', x0: 2.45, x1: 3.10, z0: 3.92, z1: 4.52, face: 'S', label: 'Upright fridge (ingredients)' },
    // dining — East unit (exit side)
    { type: 'ledge', x0: 5.85, x1: 8.20, z0: 0.06, z1: 0.42, face: 'N' },
    ...[6.3, 7.0, 7.7].map(x => ({ type: 'stool', x, z: 0.74, face: 'S' })),
    { type: 'banquette', x0: 9.30, x1: 9.76, z0: 1.45, z1: 4.00, face: 'W' },
    ...[1.85, 2.72, 3.59].flatMap(z => [
      { type: 'table', x0: 8.60, x1: 9.28, z0: z - 0.3, z1: z + 0.3 },
      { type: 'chair', x: 8.17, z, face: 'E' },
    ]),
    { type: 'ledge', x0: 5.93, x1: 6.25, z0: 2.20, z1: 3.80, face: 'E' },
    ...[2.5, 3.0, 3.5].map(z => ({ type: 'stool', x: 6.58, z, face: 'W' })),
    { type: 'table', x0: 6.40, x1: 7.80, z0: 4.25, z1: 4.95 },
    // two self-order kiosks side by side against the rear wall, clear of tables and the exit route
    { type: 'kiosk', x0: 8.20, x1: 8.70, z0: 5.20, z1: 5.60, face: 'S' },
    { type: 'kiosk', x0: 8.80, x1: 9.30, z0: 5.33, z1: 5.73, face: 'S' },
    ...[6.75, 7.45].flatMap(x => [{ type: 'chair', x, z: 3.98, face: 'N' }, { type: 'chair', x, z: 5.22, face: 'S' }]),
    { type: 'feature', wall: [[5.70, 5.25], [9.47, 6.085]], at: 0.5, width: 2.2 },
    { type: 'characters', wall: [[5.70, 2.05], [5.70, 5.20]], y: 1.30 },
    ...[[7.1, 4.6], [8.95, 1.85], [8.95, 2.72], [8.95, 3.59], [6.4, 2.6], [6.4, 3.4]].map(([x, z]) => ({ type: 'pendant', x, z })),
  ],
  zones: [
    { text: 'PASTA WINDOW', x: 1.25, z: 0.45 }, { text: 'COOK LINE', x: 0.65, z: 2.6 },
    { text: 'ORDER LANE', x: 4.0, z: 1.2 }, { text: 'BACK OF HOUSE', x: 1.8, z: 3.55 },
    { text: 'DINING', x: 7.4, z: 2.6 }, { text: 'EXISTING STAIR', x: 4.85, z: 3.8 },
    { text: 'ENTRANCE', x: 4.82, z: -0.55 }, { text: 'EXIT', x: 9.35, z: -0.55 },
  ],
  flow: [[0.68, 0.9], [0.65, 1.24], [1.2, 1.9], [1.2, 2.6], [2.35, 2.45], [3.05, 2.45]],
  customerPath: [[4.82, -1.6], [4.82, 0.2], [3.9, 0.9], [3.4, 1.84], [3.4, 2.45], [3.47, 2.2], [4.5, 1.6], [5.0, 1.58], [6.3, 1.58], [7.3, 2.4], [8.4, 1.1], [9.35, 0.3], [9.35, -1.6]],
  tour: [
    { t: 'Victoria Street', d: 'The two shopfronts. Customers enter on the left and leave on the right.', eye: [4.9, -7.2], look: [4.9, 2.0, 2.0] },
    { t: 'Through the glazing', d: 'The extruder sits 0.3 m behind the West glass at eye level. Dough goes in the top and bigoli come out the front.', eye: [1.25, -1.7], look: [0.75, 1.1, 0.5] },
    { t: 'Left entrance', d: 'Step up through the West door (dh.2145), the customer entrance.', eye: [4.82, -1.0], look: [4.4, 1.3, 2.0] },
    { t: 'Look left', d: 'The whole operation: pasta window, cook line and service counter.', eye: [4.3, 0.6], look: [1.0, 1.2, 1.3] },
    { t: 'Look right', d: 'The existing 790 mm party-wall door leads to dining and the exit.', eye: [4.4, 1.55], look: [7.5, 1.3, 1.7] },
    { t: 'Fresh pasta machine', d: 'Operator position. Dough into the mixing tank, bigoli out through the bronze die onto the trays.', eye: [1.9, 1.35], look: [0.7, 1.05, 0.48], staff: true },
    { t: 'Drying / holding rack', d: 'Ten-tray trolley one step from the machine and one step from the boiler. Holds pasta for 20–30 min.', eye: [1.8, 1.45], look: [0.65, 1.0, 1.25], staff: true },
    { t: 'Pasta boiler', d: 'Auto-lift cooker. Baskets drop into the water and lift out when the programme ends.', eye: [2.0, 1.9], look: [0.7, 0.95, 1.9], staff: true },
    { t: 'Cooking line', d: 'Boiler → induction hob → sauce well → saladette along the chimney breast, under one canopy.', eye: [1.85, 3.5], look: [0.65, 1.0, 1.4], staff: true },
    { t: 'Sauce + pan finishing', d: 'Basket to pan, tossed in sauce, then a half-turn to the plating shelf behind the cook.', eye: [2.0, 2.6], look: [0.7, 0.95, 2.62], staff: true },
    { t: 'Customer counter', d: 'One continuous counter: food display, then the POS, then collection to the customer’s right.', eye: [4.35, 1.45], look: [2.7, 1.1, 1.5] },
    { t: 'Digital menu', d: 'Three 43″ portrait screens showing the Bigoli menu boards.', eye: [4.65, 1.4], look: [2.68, 2.6, 1.9] },
    { t: 'Order status', d: 'The order TV is built into the collection wall at the end of the counter, visible from the whole lane.', eye: [3.6, 0.6], look: [2.95, 1.6, 2.8] },
    { t: 'Collection', d: 'Heated pickup shelf under heat lamps, directly right of the POS.', eye: [3.75, 1.75], look: [2.85, 1.25, 2.45] },
    { t: 'Food display', d: 'Arancini, focaccia and focaccia sandwiches at the start of the counter.', eye: [3.65, 1.25], look: [2.8, 1.12, 1.25] },
    { t: 'Dining', d: 'Through the party-wall door into the East unit: window bar, banquette and a four-top.', eye: [6.4, 1.35], look: [8.5, 0.9, 3.2] },
    { t: 'Self-order kiosks', d: 'Two standing kiosks side by side on the rear wall, clear of the tables and the exit route.', eye: [7.6, 2.6], look: [8.75, 1.2, 5.4] },
    { t: 'Look back', d: 'From the dining room, the operation is only visible through the door.', eye: [8.0, 4.3], look: [5.4, 1.3, 1.5] },
    { t: 'Right exit', d: 'Customers leave through the East door (dh.2005). The route stays clear of seating.', eye: [8.5, 1.7], look: [9.35, 1.3, -1.5] },
  ],
};

// ------------------------------------------------------------------ OPTION B
const B = {
  id: 'B',
  name: 'Option B: operation East (right)',
  summary: 'Kitchen, counter and pasta station in the East unit, with the exit route passing the pasta machine. Dining in the West unit, at the entrance.',
  journey: 'Enter left into dining (self-order kiosks by the door) → party-wall door → order lane → display → POS → collect (right of POS) → dine, or exit right past the pasta window.',
  seats: 15,
  opsUnit: 'E',
  items: [
    // 1 fresh pasta — faces the street across the exit route
    { type: 'pastaBench', x0: 7.00, x1: 8.75, z0: 1.15, z1: 1.85, face: 'N' },
    { type: 'extruder', x0: 7.30, x1: 7.83, z0: 1.21, z1: 1.79, face: 'E', step: 1 },
    { type: 'traySet', x0: 7.88, x1: 8.50, z0: 1.23, z1: 1.77 },
    { type: 'glassScreen', x0: 7.00, x1: 9.76, z0: 1.10, z1: 1.14, height: 1.55 },
    { type: 'underFridge', x0: 8.75, x1: 9.76, z0: 1.15, z1: 1.85, face: 'N', label: 'Dough fridge (under-counter)' },
    // 2 cook line along the East wall
    { type: 'rack', x0: 9.12, x1: 9.72, z0: 1.92, z1: 2.48, face: 'W', step: 2 },
    { type: 'boiler', x0: 9.06, x1: 9.76, z0: 2.50, z1: 3.20, face: 'W', step: 3 },
    { type: 'hob', x0: 9.06, x1: 9.76, z0: 3.20, z1: 3.95, face: 'W', step: 4 },
    { type: 'bain', x0: 9.06, x1: 9.76, z0: 3.95, z1: 4.50, face: 'W' },
    { type: 'canopy', x0: 8.72, x1: 9.76, z0: 2.45, z1: 4.02, wall: 'E' },
    // 3 counter facing the lane (customer faces east: right = south)
    { type: 'counter', x0: 6.90, x1: 7.60, z0: 1.90, z1: 4.45, face: 'W', step: 6,
      zones: { collect: [1.92, 2.55], pos: [2.60, 3.05], display: [3.10, 3.73] } },
    { type: 'menuScreens', x0: 7.18, x1: 7.30, z0: 1.92, z1: 3.73, face: 'W', screens: [4, 0, 1] },
    { type: 'collectWall', x0: 5.72, x1: 7.60, z0: 4.48, z1: 4.60, face: 'S', label: 'Collection wall with order-status TV' },
    // back of house (bulkhead zone + existing store)
    { type: 'potwash', x0: 8.10, x1: 9.35, z0: 4.60, z1: 5.05, face: 'S' },
    { type: 'fridge', x0: 7.30, x1: 7.95, z0: 4.75, z1: 5.35, face: 'S', label: 'Upright fridge (ingredients)' },
    { type: 'fridge', x0: 6.62, x1: 7.22, z0: 4.75, z1: 5.33, face: 'S', label: 'Upright freezer' },
    { type: 'prepTable', x0: 5.76, x1: 6.50, z0: 4.65, z1: 5.25, face: 'E', label: 'Dough prep table' },
    { type: 'shelving', x0: 10.25, x1: 10.80, z0: 5.00, z1: 6.20, face: 'W', label: 'Dry store (existing store dh.1810)' },
    // dining — West unit (entrance side)
    { type: 'ledge', x0: 0.35, x1: 4.10, z0: 0.06, z1: 0.42, face: 'N' },
    ...[0.8, 1.5, 2.2].map(x => ({ type: 'stool', x, z: 0.74, face: 'S' })),
    // two self-order kiosks side by side inside the entrance, clear of the door swing
    { type: 'kiosk', x0: 2.60, x1: 3.10, z0: 1.22, z1: 1.62, face: 'S' },
    { type: 'kiosk', x0: 3.20, x1: 3.70, z0: 1.22, z1: 1.62, face: 'S' },
    { type: 'banquette', x0: 0.30, x1: 0.76, z0: 1.60, z1: 3.32, face: 'E' },
    ...[2.0, 2.93].flatMap(z => [
      { type: 'table', x0: 0.80, x1: 1.48, z0: z - 0.3, z1: z + 0.3 },
      { type: 'chair', x: 1.9, z, face: 'W' },
    ]),
    { type: 'table', x0: 2.40, x1: 3.10, z0: 1.75, z1: 3.15 },
    ...[2.1, 2.8].flatMap(z => [{ type: 'chair', x: 2.08, z, face: 'E' }, { type: 'chair', x: 3.42, z, face: 'W' }]),
    { type: 'table', x0: 0.85, x1: 1.55, z0: 3.60, z1: 4.30 },
    { type: 'chair', x: 0.52, z: 3.95, face: 'E' }, { type: 'chair', x: 1.88, z: 3.95, face: 'W' },
    { type: 'table', x0: 2.40, x1: 3.10, z0: 3.60, z1: 4.30 },
    { type: 'chair', x: 2.08, z: 3.95, face: 'E' }, { type: 'chair', x: 3.42, z: 3.95, face: 'W' },
    { type: 'feature', wall: [[0, 4.84], [2.0, 4.30]], at: 0.5, width: 1.7 },
    { type: 'slogan', wall: [[2.0, 4.30], [5.28, 5.13]], from: 0.0, to: 0.46 },
    { type: 'characters', wall: [[0.30, 1.50], [0.30, 3.38]], y: 1.30 },
    ...[[1.15, 2.0], [1.15, 2.93], [2.75, 2.45], [1.2, 3.95], [2.75, 3.95]].map(([x, z]) => ({ type: 'pendant', x, z })),
  ],
  zones: [
    { text: 'PASTA STATION', x: 7.9, z: 1.5 }, { text: 'COOK LINE', x: 9.4, z: 3.2 },
    { text: 'ORDER LANE', x: 6.3, z: 3.0 }, { text: 'EXIT ROUTE', x: 7.8, z: 0.55 },
    { text: 'BACK OF HOUSE', x: 7.6, z: 4.6 }, { text: 'DINING', x: 2.4, z: 2.3 },
    { text: 'EXISTING STAIR', x: 4.85, z: 3.8 }, { text: 'STORE', x: 10.3, z: 5.6 },
    { text: 'ENTRANCE', x: 4.82, z: -0.55 }, { text: 'EXIT', x: 9.35, z: -0.55 },
  ],
  flow: [[7.56, 1.95], [8.2, 2.0], [9.0, 2.2], [8.85, 2.85], [8.85, 3.55], [7.6, 2.25], [6.9, 2.25]],
  customerPath: [[4.82, -1.6], [4.82, 0.3], [4.9, 1.58], [6.1, 1.9], [6.3, 4.1], [6.3, 2.85], [6.3, 2.25], [6.2, 1.4], [7.2, 0.6], [9.35, 0.45], [9.35, -1.6]],
  tour: [
    { t: 'Victoria Street', d: 'The two shopfronts. Customers enter on the left and leave on the right.', eye: [4.9, -7.2], look: [4.9, 2.0, 2.0] },
    { t: 'Through the glazing', d: 'The pasta station faces the street 1.15 m behind the East glass, across the exit route.', eye: [7.7, -1.7], look: [7.6, 1.1, 1.5] },
    { t: 'Left entrance', d: 'Step up through the West door (dh.2145), straight into the dining room.', eye: [4.82, -1.0], look: [4.5, 1.3, 2.0] },
    { t: 'Look left', d: 'Dining: window bar, banquette on the chimney breast and the rear feature wall.', eye: [4.8, 0.6], look: [1.5, 1.1, 2.4] },
    { t: 'Look right', d: 'Through the existing 790 mm party-wall door to the order lane.', eye: [4.95, 1.58], look: [7.2, 1.3, 1.6] },
    { t: 'Fresh pasta machine', d: 'Customer view from the exit route. The extruder faces the street behind a glass guard.', eye: [7.35, 0.45], look: [7.6, 1.1, 1.5] },
    { t: 'Drying / holding rack', d: 'Tray trolley at the head of the cook line, between the machine and the boiler.', eye: [8.2, 2.15], look: [9.4, 1.1, 2.2], staff: true },
    { t: 'Pasta boiler', d: 'Auto-lift cooker. Baskets drop into the water and lift out when the programme ends.', eye: [8.2, 3.1], look: [9.4, 0.95, 2.85], staff: true },
    { t: 'Cooking line', d: 'Rack → boiler → induction hob → sauce well along the East wall, under one canopy.', eye: [8.15, 4.35], look: [9.4, 1.0, 2.0], staff: true },
    { t: 'Sauce + pan finishing', d: 'Basket to pan, tossed in sauce, then plated on the counter behind the cook.', eye: [8.2, 3.55], look: [9.4, 0.95, 3.55], staff: true },
    { t: 'Customer counter', d: 'One continuous counter. From north to south: display, POS, then collection to the customer’s right.', eye: [5.95, 2.8], look: [7.3, 1.1, 2.8] },
    { t: 'Digital menu', d: 'Three 43″ portrait screens showing the Bigoli menu boards.', eye: [5.85, 2.1], look: [7.24, 2.55, 3.0] },
    { t: 'Order status', d: 'The order TV is built into the collection wall at the head of the lane.', eye: [6.3, 2.2], look: [6.6, 1.6, 4.5] },
    { t: 'Collection', d: 'Heated pickup shelf under heat lamps, directly right of the POS. It sits next to the dining door and the exit route.', eye: [6.0, 2.25], look: [7.2, 1.2, 2.2] },
    { t: 'Food display', d: 'Arancini, focaccia and focaccia sandwiches facing the queue.', eye: [6.15, 3.4], look: [7.2, 1.12, 3.4] },
    { t: 'Self-order kiosks', d: 'Two standing kiosks side by side just inside the entrance.', eye: [4.45, 0.35], look: [3.0, 1.2, 1.4] },
    { t: 'Dining', d: 'Back through the party-wall door into the West unit dining room.', eye: [4.55, 0.45], look: [1.2, 0.9, 3.4] },
    { t: 'Look back', d: 'From the rear table the operation is only visible through the party-wall door.', eye: [1.6, 3.5], look: [5.6, 1.35, 1.6] },
    { t: 'Right exit', d: 'Leaving along the front of the East unit, past the pasta station, out through the East door.', eye: [6.3, 0.6], look: [9.35, 1.2, -0.4] },
  ],
};

// ------------------------------------------------------------------ OPTION B2
// Client revision of B (30 Sep 2026, "B plan / Kitchen Right – layout revision").
// Same shell and kitchen side as B; changes:
//   - East door moved from the right of the East shopfront (x 8.93–9.76) to its
//     left (x 5.70–6.53), so both doors sit side by side either side of the party
//     wall. The old opening is infilled with glazing to match.
//   - Two pasta extruders at the East glazing, facing each other across a shared
//     tray bench, with the pasta shelving at the end of the bench.
//   - Main counter turned to run parallel to the shopfront, directly ahead of the
//     new East door: collection | POS | arancini/focaccia display, then a separate
//     delivery pick-up return at the east end.
//   - Two self-order kiosks immediately left inside the West door, on the glazing.
//   - 55" order-status TV over the party-wall door, facing the dining room.
//   - Customer waste / tray-return station in the low-headroom bay beside the stair.
const B2 = {
  id: 'B2',
  name: 'Option B2: kitchen right, revised',
  summary: 'Revision of B. Both doors now sit together on the left of each shopfront. Two pasta machines face each other behind the East glass. Self-order kiosks are just inside the West door, and the main counter faces the East door directly.',
  journey: 'West door → self-order kiosks → sit down → watch the order TV above the party-wall door → collect at the counter just through that door. Walk-ins and riders use the East door: counter straight ahead, riders go to the separate delivery point at the east end.',
  seats: 15,
  opsUnit: 'E',
  partyDoorOpen: true,
  mapMarks: [['IN', 4.82], ['IN', 6.12]],
  shopfront: {
    west: { glazing: [0, 4.37, [2.185]], door: { x0: 4.37, x1: 5.28, head: 2.145, hinge: 'east', sign: 'ENTRANCE · EAT IN' } },
    east: { glazing: [6.53, 9.76, [7.61, 8.69]], door: { x0: 5.70, x1: 6.53, head: 2.005, hinge: 'west', sign: 'TAKEAWAY · DELIVERY' } },
  },
  items: [
    // 1 fresh pasta — two extruders facing each other behind the East glazing
    { type: 'pastaBench', x0: 7.28, x1: 9.28, z0: 0.12, z1: 0.82, face: 'N', label: 'Pasta production bench (shared by both machines)' },
    { type: 'extruder', x0: 7.33, x1: 7.91, z0: 0.18, z1: 0.76, face: 'E', step: 1, label: 'Pasta extruder 1 (faces machine 2)' },
    { type: 'traySet', x0: 7.98, x1: 8.62, z0: 0.20, z1: 0.74 },
    { type: 'extruder', x0: 8.69, x1: 9.27, z0: 0.18, z1: 0.76, face: 'W', label: 'Pasta extruder 2 (faces machine 1)' },
    { type: 'pastaShelf', x0: 9.33, x1: 9.76, z0: 0.12, z1: 1.62, face: 'W', step: 2, chilled: true, label: 'Chilled fresh-pasta display (open multideck, 0–5 °C, baskets)' },
    { type: 'handwash', x0: 9.36, x1: 9.76, z0: 1.70, z1: 2.14, face: 'W', label: 'Hand-wash basin: pasta window' },
    // low glass guards: customers see production up close, staff keep a clean zone
    { type: 'glassScreen', x0: 7.19, x1: 7.23, z0: 0.08, z1: 0.92, face: 'E', height: 1.2 },
    // staff entry: self-closing half-height gate from the East door lobby into the pasta
    // window, then along the East-side passage to the kitchen (no crossing the counter lane)
    { type: 'staffGate', x0: 7.19, x1: 7.23, z0: 0.92, z1: 1.72, face: 'E' },
    { type: 'glassScreen', x0: 7.21, x1: 8.05, z0: 1.72, z1: 1.76, height: 1.2 },
    // 2 service counter parallel to the shopfront, straight ahead of the East door
    // (customer faces north: right = east). Collection is nearest the party-wall door.
    { type: 'counter', x0: 5.74, x1: 8.35, z0: 2.95, z1: 3.55, face: 'S', step: 6, collectSign: true,
      zones: { collect: [5.80, 6.52], pos: [6.70, 7.20], display: [7.32, 8.00] } },
    { type: 'menuScreens', x0: 5.95, x1: 8.30, z0: 3.30, z1: 3.42, face: 'S', screens: [4, 0, 1, 2] },
    { type: 'deliveryPoint', x0: 8.05, x1: 8.35, z0: 1.78, z1: 2.95, face: 'W' },
    // v5 kitchen: cook line turned to the rear wall (faces the counter back across a
    // 1.0 m aisle) — boiler → hob → plate on the counter back → collection, 2 steps
    { type: 'boiler', x0: 5.74, x1: 6.44, z0: 4.55, z1: 5.25, face: 'S', step: 3 },
    { type: 'hob', x0: 6.44, x1: 7.19, z0: 4.55, z1: 5.25, face: 'S', step: 4 },
    { type: 'filler', x0: 6.44, x1: 7.19, z0: 5.25, z1: 5.40 },
    { type: 'canopy', x0: 5.72, x1: 7.49, z0: 4.25, z1: 5.26, wall: 'N' },
    // back of house: fridges on the rear wall, pot wash in the rear-east corner (off the
    // staff passage), freezer + dough prep on the East wall, basin by the counter end
    { type: 'fridge', x0: 7.30, x1: 7.95, z0: 4.85, z1: 5.45, face: 'S', label: 'Upright fridge (ingredients)' },
    { type: 'fridge', x0: 8.00, x1: 8.62, z0: 4.95, z1: 5.55, face: 'S', label: 'Upright fridge (dough + pasta back-up)' },
    { type: 'potwash', x0: 8.66, x1: 9.40, z0: 5.12, z1: 5.62, face: 'S', label: 'Pot wash + dishwasher + hand-wash basin' },
    { type: 'handwash', x0: 9.36, x1: 9.76, z0: 3.02, z1: 3.46, face: 'W', label: 'Hand-wash basin: counter + kitchen' },
    { type: 'fridge', x0: 9.16, x1: 9.76, z0: 3.52, z1: 4.10, face: 'W', label: 'Upright freezer' },
    { type: 'prepTable', x0: 9.16, x1: 9.76, z0: 4.14, z1: 4.84, face: 'W', label: 'Dough prep table' },
    { type: 'shelving', x0: 10.25, x1: 10.80, z0: 5.00, z1: 6.20, face: 'W', label: 'Dry store (existing store dh.1810)' },
    // dining — West unit
    { type: 'kiosk', x0: 3.18, x1: 3.68, z0: 0.14, z1: 0.54, face: 'N', accessible: true, label: 'Self-order kiosk, lowered (accessible)' },
    { type: 'kiosk', x0: 3.76, x1: 4.26, z0: 0.14, z1: 0.54, face: 'N' },
    { type: 'orderTV', x0: 5.16, x1: 5.28, z0: 0.98, z1: 2.19, face: 'W' },
    { type: 'binStation', x0: 3.66, x1: 4.40, z0: 4.16, z1: 4.66, face: 'S' },
    { type: 'ledge', x0: 0.35, x1: 2.95, z0: 0.06, z1: 0.42, face: 'N' },
    ...[0.8, 1.5, 2.2].map(x => ({ type: 'stool', x, z: 0.74, face: 'S' })),
    { type: 'banquette', x0: 0.30, x1: 0.76, z0: 1.60, z1: 3.32, face: 'E' },
    ...[2.0, 2.93].flatMap(z => [
      { type: 'table', x0: 0.80, x1: 1.48, z0: z - 0.3, z1: z + 0.3 },
      { type: 'chair', x: 1.9, z, face: 'W' },
    ]),
    { type: 'table', x0: 2.40, x1: 3.10, z0: 1.90, z1: 3.30, label: 'Table (Mizzi), accessible: 740 mm, knee space, movable chairs' },
    ...[2.25, 2.95].flatMap(z => [{ type: 'chair', x: 2.08, z, face: 'E' }, { type: 'chair', x: 3.42, z, face: 'W' }]),
    { type: 'table', x0: 0.85, x1: 1.55, z0: 3.60, z1: 4.30 },
    { type: 'chair', x: 0.52, z: 3.95, face: 'E' }, { type: 'chair', x: 1.88, z: 3.95, face: 'W' },
    { type: 'table', x0: 2.30, x1: 3.00, z0: 3.60, z1: 4.30 },
    { type: 'chair', x: 1.98, z: 3.95, face: 'E' }, { type: 'chair', x: 3.32, z: 3.95, face: 'W' },
    { type: 'feature', wall: [[0, 4.84], [2.0, 4.30]], at: 0.5, width: 1.7 },
    { type: 'characters', wall: [[0.30, 1.50], [0.30, 3.38]], y: 1.30 },
    ...[[1.15, 2.0], [1.15, 2.93], [2.75, 2.45], [1.2, 3.95], [2.65, 3.95]].map(([x, z]) => ({ type: 'pendant', x, z })),
  ],
  zones: [
    { text: 'PASTA WINDOW', x: 8.3, z: 1.25 }, { text: 'COOK LINE', x: 6.1, z: 4.9 },
    { text: 'ORDER + COLLECT', x: 6.6, z: 2.35 }, { text: 'DELIVERY', x: 8.9, z: 2.35 }, { text: 'STAFF GATE', x: 7.2, z: 1.35 },
    { text: 'BACK OF HOUSE', x: 8.2, z: 4.45 }, { text: 'KITCHEN AISLE 1.0 m', x: 6.6, z: 4.05 }, { text: 'DINING', x: 1.9, z: 2.45 },
    { text: 'KIOSKS', x: 3.7, z: 0.95 }, { text: 'WASTE', x: 4.0, z: 3.85 },
    { text: 'EXISTING STAIR', x: 4.85, z: 3.8 }, { text: 'STORE', x: 10.3, z: 5.6 },
    { text: 'EAT IN', x: 4.82, z: -0.55 }, { text: 'TAKEAWAY', x: 6.12, z: -0.55 },
  ],
  // food: machines → shelving → staff passage → boiler → hob → plate on counter back → collection / delivery
  flow: [[8.3, 1.0], [9.1, 1.25], [8.9, 2.3], [8.7, 3.9], [6.1, 4.1], [6.8, 4.1], [6.3, 3.6], [6.15, 2.95]],
  customerPath: [[4.82, -1.6], [4.82, 0.3], [4.2, 0.85], [3.4, 0.95], [3.0, 1.45], [3.75, 1.9], [4.6, 1.58], [5.5, 1.58], [6.15, 2.3], [6.15, 2.8]],
  extraPaths: [[[6.12, -1.6], [6.12, 0.4], [6.6, 1.6], [6.95, 2.5]]],
  deliveryPath: [[5.95, -1.6], [5.95, 0.5], [6.8, 1.6], [7.7, 2.35]],
  staffPath: [[6.3, -1.6], [6.3, 0.6], [6.9, 1.3], [7.6, 1.3], [8.8, 1.3], [8.8, 2.9], [8.8, 3.9], [7.5, 4.1], [6.4, 4.05]],
  tour: [
    { t: 'Victoria Street', d: 'Both doors now sit together in the middle-left of the frontage. The East shopfront is continuous glazing with the two pasta machines behind it.', eye: [4.9, -7.2], look: [5.4, 2.0, 2.0] },
    { t: 'Pasta through the glass', d: 'Two extruders face each other across a shared tray bench right behind the East glazing. At the end of the bench, the day’s pasta sits in baskets in a chilled open-front display (0–5 °C).', eye: [8.2, -1.7], look: [8.3, 1.0, 0.6] },
    { t: 'Two doors, side by side', d: 'Left: EAT IN (existing West door). Right: TAKEAWAY · DELIVERY (the East door, moved from the far right). The old right-hand opening is now glazing.', eye: [5.5, -2.6], look: [5.5, 1.3, 0.5] },
    { t: 'West door → kiosks', d: 'Step in and the two self-order kiosks are immediately on your left, against the glazing.', eye: [4.82, -0.7], look: [3.7, 1.25, 0.4] },
    { t: 'Self-order kiosks', d: 'Two kiosks side by side, clear of the door swing. The left one is lowered (touch area and card reader within 750–1200 mm, knee space) with a 1.5 m turning space in front.', eye: [4.1, 1.25], look: [3.7, 1.3, 0.2] },
    { t: 'Dining + order TV', d: 'From the tables, the 55″ order-status TV is above the party-wall door. When your number shows READY, go through that door to collect.', eye: [1.4, 3.2], look: [5.2, 2.5, 1.6] },
    { t: 'Waste station', d: 'Tray return, recycling and general waste in built-in joinery in the low-headroom bay beside the stair. It is off the entrance and the stair, and away from food production.', eye: [2.9, 2.6], look: [4.0, 0.8, 4.4] },
    { t: 'Collection point', d: 'One step through the party-wall door and COLLECT HERE is on your left, at the west end of the counter, closest to the cook line. It is away from the POS queue and the delivery point.', eye: [6.75, 1.55], look: [6.0, 1.15, 3.1] },
    { t: 'East door → counter', d: 'Walk in through the East door and the counter is straight ahead: collection, POS, arancini and focaccia display, with the menu screens above.', eye: [6.12, -0.5], look: [6.8, 1.6, 3.4] },
    { t: 'Pasta machines (inside)', d: 'To the right of the East door. Machine → facing ← machine behind a low glass guard, with 0.9 m for the operator between the bench and the guard.', eye: [6.5, 0.9], look: [8.3, 1.0, 0.5] },
    { t: 'Main counter', d: 'One continuous 2.6 m counter parallel to the shopfront: COLLECT HERE nearest the dining door, ORDER HERE (POS) in the middle, then the arancini / focaccia display.', eye: [6.9, 1.9], look: [6.9, 1.2, 3.3] },
    { t: 'Menu screens', d: 'Four 43″ portrait menu screens on one rail above the counter, readable from both doors.', eye: [6.3, 1.0], look: [7.0, 2.6, 3.36] },
    { t: 'Food display', d: 'Heated display for arancini, focaccia and grab-and-go, built into the counter at the POS.', eye: [7.6, 2.3], look: [7.65, 1.1, 3.1] },
    { t: 'Delivery pick-up', d: 'Separate blue DELIVERY PICK-UP point on the counter return at the east end. Riders never cross the collection point.', eye: [6.9, 2.3], look: [8.2, 1.5, 2.35] },
    { t: 'Staff gate', d: 'Staff come in through the East door and turn right through a self-closing half-height gate into the pasta window, then along the East-side passage to the kitchen. They never go behind the customer counter from the front.', eye: [6.2, 0.9], look: [7.4, 0.8, 1.3] },
    { t: 'Pasta station (staff)', d: 'Operator stands between the bench and the guard, facing the street. The shelving is at arm’s reach and the staff passage leads straight back to the kitchen.', eye: [8.8, 2.2], look: [8.2, 0.95, 0.4], staff: true },
    { t: 'Cook line', d: 'Boiler and induction hob on the rear wall under one canopy, facing the counter across a 1.0 m aisle. Cook → turn → plate on the counter back → COLLECT, two steps.', eye: [7.3, 3.8], look: [6.4, 1.0, 4.9], staff: true },
    { t: 'Kitchen aisle + hand wash', d: 'Looking along the kitchen: the counter back on the left, the cook line on the right, and the hand-wash basin at the end by the staff passage.', eye: [5.95, 4.05], look: [9.5, 1.1, 3.3], staff: true },
    { t: 'Back of house', d: 'Fridges on the rear wall, pot wash in the rear-east corner off the staff route, freezer and dough prep on the East wall. The dry store is through the existing door.', eye: [7.4, 4.15], look: [9.2, 1.1, 5.2], staff: true },
    { t: 'Look back to the street', d: 'From the counter: both doors, the pasta window and Victoria Street.', eye: [6.8, 2.6], look: [6.8, 1.4, -1.5] },
  ],
};

export const OPTIONS = { A, B, B2 };
