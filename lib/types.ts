export type YesNo = 'Yes' | 'No';
export type Gender = 'Female' | 'Male' | 'Prefer not to say';

export interface AttendeeInput {
  name: string;
  contact: string;
  gender: Gender | '';
  pwd: YesNo | '';
}

/** What the browser sends to /api/submit. */
export interface RegistrationInput {
  consent: 'Agree' | 'Not Agree' | '';
  city: string;
  barangay: string;
  hallAddress: string;
  brgyContact: string;
  brgyEmail: string;
  chairperson: string;
  focalPerson: string;
  focalContact: string;
  focalEmail: string;
  willAttend: YesNo | '';
  attendees: AttendeeInput[];
  /** Honeypot — real people never fill this in. */
  website?: string;
}

export interface Attendee {
  name: string;
  contact: string;
  gender: string;
  pwd: string;
}

/** A registration as read back from Airtable for the dashboard. */
export interface Registration {
  id: string;
  ref: string;
  submittedAt: string;
  consent: string;
  province: string;
  city: string;
  barangay: string;
  hallAddress: string;
  brgyContact: string;
  brgyEmail: string;
  chairperson: string;
  focalPerson: string;
  focalContact: string;
  focalEmail: string;
  willAttend: string;
  attendeeCount: number;
  attendees: Attendee[];
}

export interface SchemaStatus {
  ok: boolean;
  tableName?: string;
  missing: string[];
  error?: string;
}

export type FieldErrors = Record<string, string>;
