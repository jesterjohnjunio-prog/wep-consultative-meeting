import { ALL_CITIES, EVENT, GENDERS, PROVINCES } from './config';

/** Airtable column names. Renaming a column in Airtable requires renaming it here too. */
export const F = {
  ref: 'Reference No.',
  submittedAt: 'Submitted At',
  consent: 'Data Privacy Consent',
  province: 'Province',
  city: 'City/Municipality',
  barangay: 'Barangay',
  hallAddress: 'Barangay Hall Address',
  brgyContact: 'Barangay Contact Number',
  brgyEmail: 'Barangay Email',
  chairperson: 'Barangay Chairperson',
  focalPerson: 'Focal Person',
  focalContact: 'Focal Person Contact Number',
  focalEmail: 'Focal Person Email',
  willAttend: 'Will Attend',
  attendeeCount: 'No. of Attendees',
  a1Name: 'Attendee 1 Name',
  a1Contact: 'Attendee 1 Contact Number',
  a1Gender: 'Attendee 1 Gender',
  a1Pwd: 'Attendee 1 PWD',
  a2Name: 'Attendee 2 Name',
  a2Contact: 'Attendee 2 Contact Number',
  a2Gender: 'Attendee 2 Gender',
  a2Pwd: 'Attendee 2 PWD',
} as const;

export const ATTENDEE_FIELDS = [
  { name: F.a1Name, contact: F.a1Contact, gender: F.a1Gender, pwd: F.a1Pwd },
  { name: F.a2Name, contact: F.a2Contact, gender: F.a2Gender, pwd: F.a2Pwd },
] as const;

export interface FieldSpec {
  name: string;
  type: string;
  description?: string;
  options?: Record<string, unknown>;
}

const choices = (names: readonly string[], colors: string[] = []) => ({
  choices: names.map((name, i) => (colors[i] ? { name, color: colors[i] } : { name })),
});

const yesNo = () => choices(['Yes', 'No'], ['greenLight2', 'redLight2']);
const genders = () => choices(GENDERS.map((g) => g.value), ['pinkLight2', 'blueLight2', 'grayLight2']);

/** Table schema, in column order. The first entry is the primary field. */
export const FIELD_SPECS: FieldSpec[] = [
  { name: F.ref, type: 'singleLineText', description: 'Auto-generated reference number of the registration.' },
  {
    name: F.submittedAt,
    type: 'dateTime',
    description: 'Date and time the form was submitted (Philippine time).',
    options: { dateFormat: { name: 'local' }, timeFormat: { name: '12hour' }, timeZone: 'Asia/Manila' },
  },
  { name: F.consent, type: 'singleSelect', options: choices(['Agree', 'Not Agree'], ['greenLight2', 'redLight2']) },
  { name: F.province, type: 'singleSelect', options: choices(PROVINCES) },
  { name: F.city, type: 'singleSelect', description: 'Lungsod / Bayan', options: choices(ALL_CITIES) },
  { name: F.barangay, type: 'singleLineText', description: 'Pangalan ng Barangay' },
  { name: F.hallAddress, type: 'multilineText', description: 'Lokasyon ng Barangay Hall' },
  { name: F.brgyContact, type: 'phoneNumber', description: 'Telepono / Mobile Number ng Barangay' },
  { name: F.brgyEmail, type: 'email', description: 'Email Address ng Barangay' },
  { name: F.chairperson, type: 'singleLineText', description: 'Pangalan ng Punong Barangay / Kapitan' },
  { name: F.focalPerson, type: 'singleLineText', description: 'Nakatalagang Kinatawan para sa Water Efficiency Program' },
  { name: F.focalContact, type: 'phoneNumber' },
  { name: F.focalEmail, type: 'email' },
  {
    name: F.willAttend,
    type: 'singleSelect',
    description: `Will representative/s attend the Consultative Meeting on ${EVENT.dateEn}?`,
    options: yesNo(),
  },
  { name: F.attendeeCount, type: 'number', options: { precision: 0 } },
  { name: F.a1Name, type: 'singleLineText' },
  { name: F.a1Contact, type: 'phoneNumber' },
  { name: F.a1Gender, type: 'singleSelect', options: genders() },
  { name: F.a1Pwd, type: 'singleSelect', description: 'Person with Disability', options: yesNo() },
  { name: F.a2Name, type: 'singleLineText' },
  { name: F.a2Contact, type: 'phoneNumber' },
  { name: F.a2Gender, type: 'singleSelect', options: genders() },
  { name: F.a2Pwd, type: 'singleSelect', description: 'Person with Disability', options: yesNo() },
];
