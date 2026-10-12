// Shared by the form (instant feedback) and /api/submit (the authority).
import { ALL_CITIES, GENDERS } from './config';
import type { AttendeeInput, FieldErrors, RegistrationInput } from './types';

export const MSG = {
  required: 'Kinakailangang sagutan · This field is required',
  choose: 'Pumili ng isa · Please choose an option',
  email: 'Hindi wastong email · Please enter a valid email address',
  phone: 'Hindi wastong numero · Please enter a valid contact number',
  consent: 'Kailangang sumang-ayon upang magpatuloy · You must agree to continue',
  tooLong: 'Masyadong mahaba · This answer is too long',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Digits, spaces, + ( ) - . / , — e.g. "0917 123 4567", "(02) 8123-4567 / 0917…"
const PHONE_CHARS_RE = /^[0-9+()\-.\s/,]+$/;

export const LIMITS = { short: 150, long: 400 };

export function clean(v: unknown, max = LIMITS.short): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max + 1) : '';
}

export function isEmail(v: string) {
  return EMAIL_RE.test(v) && v.length <= 254;
}

export function isPhone(v: string) {
  const digits = v.replace(/\D/g, '');
  return PHONE_CHARS_RE.test(v) && digits.length >= 7 && digits.length <= 30;
}

function text(errors: FieldErrors, key: string, value: string, max = LIMITS.short) {
  if (!value) errors[key] = MSG.required;
  else if (value.length > max) errors[key] = MSG.tooLong;
}

function phone(errors: FieldErrors, key: string, value: string) {
  if (!value) errors[key] = MSG.required;
  else if (!isPhone(value)) errors[key] = MSG.phone;
}

export function validateStep1(d: RegistrationInput): FieldErrors {
  const e: FieldErrors = {};
  if (d.consent !== 'Agree') e.consent = d.consent === 'Not Agree' ? MSG.consent : MSG.choose;
  if (!d.city) e.city = MSG.choose;
  else if (!ALL_CITIES.includes(d.city)) e.city = MSG.choose;
  text(e, 'barangay', d.barangay);
  text(e, 'hallAddress', d.hallAddress, LIMITS.long);
  phone(e, 'brgyContact', d.brgyContact);
  if (d.brgyEmail && !isEmail(d.brgyEmail)) e.brgyEmail = MSG.email;
  text(e, 'chairperson', d.chairperson);
  text(e, 'focalPerson', d.focalPerson);
  phone(e, 'focalContact', d.focalContact);
  if (!d.focalEmail) e.focalEmail = MSG.required;
  else if (!isEmail(d.focalEmail)) e.focalEmail = MSG.email;
  if (d.willAttend !== 'Yes' && d.willAttend !== 'No') e.willAttend = MSG.choose;
  return e;
}

export function attendeeIsBlank(a: AttendeeInput | undefined) {
  return !a || (!a.name && !a.contact && !a.gender && !a.pwd);
}

export function validateAttendee(e: FieldErrors, a: AttendeeInput, i: number) {
  const k = (f: string) => `attendees.${i}.${f}`;
  text(e, k('name'), a.name);
  phone(e, k('contact'), a.contact);
  if (!GENDERS.some((g) => g.value === a.gender)) e[k('gender')] = MSG.choose;
  if (a.pwd !== 'Yes' && a.pwd !== 'No') e[k('pwd')] = MSG.choose;
}

export function validateStep2(d: RegistrationInput): FieldErrors {
  const e: FieldErrors = {};
  if (d.willAttend !== 'Yes') return e;
  validateAttendee(e, d.attendees[0] ?? { name: '', contact: '', gender: '', pwd: '' }, 0);
  // The second attendee is optional, but once started it must be complete.
  if (!attendeeIsBlank(d.attendees[1])) validateAttendee(e, d.attendees[1], 1);
  return e;
}

export function validateAll(d: RegistrationInput): FieldErrors {
  return { ...validateStep1(d), ...validateStep2(d) };
}

/** Coerce an untrusted request body into a RegistrationInput with trimmed strings. */
export function normalizeInput(body: unknown): RegistrationInput {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const rawAttendees = Array.isArray(b.attendees) ? b.attendees.slice(0, 2) : [];
  const attendees = rawAttendees.map((x) => {
    const a = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    return {
      name: clean(a.name),
      contact: clean(a.contact),
      gender: clean(a.gender) as AttendeeInput['gender'],
      pwd: clean(a.pwd) as AttendeeInput['pwd'],
    };
  });
  return {
    consent: clean(b.consent) as RegistrationInput['consent'],
    city: clean(b.city),
    barangay: clean(b.barangay),
    hallAddress: clean(b.hallAddress, LIMITS.long),
    brgyContact: clean(b.brgyContact),
    brgyEmail: clean(b.brgyEmail).toLowerCase(),
    chairperson: clean(b.chairperson),
    focalPerson: clean(b.focalPerson),
    focalContact: clean(b.focalContact),
    focalEmail: clean(b.focalEmail).toLowerCase(),
    willAttend: clean(b.willAttend) as RegistrationInput['willAttend'],
    attendees,
    website: clean(b.website),
  };
}
