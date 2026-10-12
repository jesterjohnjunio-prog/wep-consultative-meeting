// Event details and reference lists, taken from the Initial WEP Plan (Consultative Meeting questionnaire).

export const EVENT = {
  title: 'Barangay Consultative Meeting',
  program: 'MWSS RO Water Efficiency Program',
  dateFil: 'Oktubre 27, 2026',
  dateEn: 'October 27, 2026',
  dateIso: '2026-10-27',
  time: '1:00 PM – 5:00 PM',
  venue: 'Manila Water Lakbayan Center',
  /** Target headcount for the meeting (WEP Plan timeline: 60–70 pax). */
  capacity: 70,
  /** Maximum representatives per barangay. */
  maxAttendees: 2,
} as const;

export const PROVINCES = ['Metro Manila', 'Cavite', 'Rizal'] as const;
export type Province = (typeof PROVINCES)[number];

/** Cities and municipalities within the MWSS concession areas (WEP Plan, "Case 5"). */
export const LOCATIONS: Record<Province, string[]> = {
  'Metro Manila': [
    'Caloocan',
    'Las Piñas',
    'Makati',
    'Malabon',
    'Mandaluyong',
    'Manila',
    'Marikina',
    'Muntinlupa',
    'Navotas',
    'Parañaque',
    'Pasay',
    'Pasig',
    'Pateros',
    'Quezon City',
    'San Juan',
    'Taguig',
    'Valenzuela',
  ],
  Cavite: ['Bacoor', 'Cavite City', 'Imus', 'Kawit', 'Noveleta', 'Rosario'],
  Rizal: [
    'Angono',
    'Antipolo',
    'Baras',
    'Binangonan',
    'Cainta',
    'Cardona',
    'Jalajala',
    'Morong',
    'Pililla',
    'Rodriguez (Montalban)',
    'San Mateo',
    'Tanay',
    'Taytay',
    'Teresa',
  ],
};

export const ALL_CITIES = PROVINCES.flatMap((p) => LOCATIONS[p]);

export function provinceOf(city: string): Province | '' {
  for (const p of PROVINCES) if (LOCATIONS[p].includes(city)) return p;
  return '';
}

/** 'Blue Ridge B' → 'Barangay Blue Ridge B'; leaves 'Brgy. …' / 'Barangay …' as typed. */
export function withBarangay(name: string) {
  return /^(barangay|brgy\.?)\s/i.test(name.trim()) ? name.trim() : `Barangay ${name.trim()}`;
}

export const GENDERS = [
  { value: 'Female', fil: 'Babae', en: 'Female' },
  { value: 'Male', fil: 'Lalaki', en: 'Male' },
  { value: 'Prefer not to say', fil: 'Mas piniling hindi sabihin', en: 'Prefer not to say' },
] as const;

export const YES_NO = [
  { value: 'Yes', fil: 'Oo', en: 'Yes' },
  { value: 'No', fil: 'Hindi', en: 'No' },
] as const;
