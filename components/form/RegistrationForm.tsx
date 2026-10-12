'use client';

import { useEffect, useRef, useState } from 'react';
import { EVENT, GENDERS, withBarangay, YES_NO } from '@/lib/config';
import type { AttendeeInput, FieldErrors, RegistrationInput } from '@/lib/types';
import { attendeeIsBlank, validateAll, validateStep1, validateStep2 } from '@/lib/validation';
import { Alert, ArrowLeft, ArrowRight, Building, Check, Copy, Info, MapPin, Shield, Users } from '../Icons';
import { ChoiceGroup, CitySelect, fieldId, TextField } from './Fields';

const DRAFT_KEY = 'wep-cm-draft-v1';
const blankAttendee = (): AttendeeInput => ({ name: '', contact: '', gender: '', pwd: '' });
const initialData = (): RegistrationInput => ({
  consent: '',
  city: '',
  barangay: '',
  hallAddress: '',
  brgyContact: '',
  brgyEmail: '',
  chairperson: '',
  focalPerson: '',
  focalContact: '',
  focalEmail: '',
  willAttend: '',
  attendees: [blankAttendee(), blankAttendee()],
  website: '',
});

const CONSENT_OPTIONS = [
  { value: 'Agree', fil: 'Sumasang-ayon', en: 'Agree' },
  { value: 'Not Agree', fil: 'Hindi sumasang-ayon', en: 'Not Agree' },
] as const;

type Status = 'idle' | 'submitting' | 'done';

export default function RegistrationForm() {
  const [data, setData] = useState<RegistrationInput>(initialData);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState<{ 1: boolean; 2: boolean }>({ 1: false, 2: false });
  const [status, setStatus] = useState<Status>('idle');
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState<{ ref: string; data: RegistrationInput } | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const loaded = useRef(false);

  // Keep an in-progress draft for this browser tab only (sessionStorage clears when the tab closes,
  // which matters on shared barangay computers).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<RegistrationInput>;
        setData((d) => ({
          ...d,
          ...saved,
          attendees: [0, 1].map((i) => ({ ...blankAttendee(), ...(saved.attendees?.[i] ?? {}) })),
          website: '',
        }));
      }
    } catch {
      /* storage unavailable — start fresh */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current || status === 'done') return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [data, status]);

  // Once a step has been attempted, re-check it as the user types.
  useEffect(() => {
    if (attempted[step]) setErrors(step === 1 ? validateStep1(data) : validateStep2(data));
  }, [data, step, attempted]);

  const set = (key: keyof Omit<RegistrationInput, 'attendees'>) => (v: string) => setData((d) => ({ ...d, [key]: v }));
  const setAtt = (i: number, key: keyof AttendeeInput) => (v: string) =>
    setData((d) => ({ ...d, attendees: d.attendees.map((a, j) => (j === i ? { ...a, [key]: v } : a)) }));

  const scrollToCard = () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const focusFirstError = (errs: FieldErrors) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(fieldId(first));
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el.matches('[role=radiogroup]') ? (el.querySelector('input') ?? el) : el).focus({ preventScroll: true });
    });
  };

  async function submit() {
    const errs = validateAll(data);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setAttempted({ 1: true, 2: true });
      const step1Bad = Object.keys(validateStep1(data)).length > 0;
      if (step1Bad) setStep(1);
      focusFirstError(errs);
      return;
    }
    setStatus('submitting');
    setServerError('');
    const payload: RegistrationInput = {
      ...data,
      attendees: data.willAttend === 'Yes' ? data.attendees.filter((a, i) => i === 0 || !attendeeIsBlank(a)) : [],
    };
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; ref?: string; message?: string; errors?: FieldErrors };
      if (!res.ok || !json.ok || !json.ref) {
        if (json.errors) {
          setErrors(json.errors);
          if (Object.keys(json.errors).some((k) => !k.startsWith('attendees'))) setStep(1);
          focusFirstError(json.errors);
        }
        throw new Error(json.message || 'Hindi naisumite (Submission failed. Please try again.)');
      }
      setResult({ ref: json.ref, data: payload });
      setStatus('done');
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      window.requestAnimationFrame(scrollToCard);
    } catch (e) {
      setStatus('idle');
      setServerError(
        e instanceof TypeError
          ? 'Walang koneksyon sa internet (Network error. Please check your connection and try again.)'
          : (e as Error).message,
      );
    }
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    if (step === 1) {
      const errs = validateStep1(data);
      setAttempted((a) => ({ ...a, 1: true }));
      setErrors(errs);
      if (Object.keys(errs).length) return focusFirstError(errs);
      if (data.willAttend === 'No') return void submit();
      setStep(2);
      setErrors(attempted[2] ? validateStep2(data) : {});
      window.requestAnimationFrame(scrollToCard);
      return;
    }
    setAttempted((a) => ({ ...a, 2: true }));
    void submit();
  }

  function reset() {
    setData(initialData());
    setErrors({});
    setAttempted({ 1: false, 2: false });
    setStep(1);
    setResult(null);
    setStatus('idle');
    setCopied(false);
    window.requestAnimationFrame(scrollToCard);
  }

  if (status === 'done' && result) {
    return (
      <section className="form-card success-card" ref={cardRef} aria-live="polite">
        <div className="success-drop" aria-hidden="true">
          <svg viewBox="0 0 120 150">
            <defs>
              <linearGradient id="dropFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5fd3f3" />
                <stop offset="1" stopColor="#0a5aa8" />
              </linearGradient>
            </defs>
            <path className="success-drop-shape" d="M60 6C60 6 12 62 12 96a48 48 0 0 0 96 0C108 62 60 6 60 6Z" fill="url(#dropFill)" />
            <path className="success-drop-check" d="m38 98 15 15 30-32" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="success-title">Salamat po! (Thank you!)</h2>
        <p className="success-lead">
          {result.data.willAttend === 'Yes'
            ? `Natanggap na ang rehistro ng ${withBarangay(result.data.barangay)}. Magkita-kita po tayo sa ${EVENT.dateFil}.`
            : `Natanggap na ang tugon ng ${withBarangay(result.data.barangay)}. Salamat sa pagpapaalam.`}
          <span>
            {result.data.willAttend === 'Yes'
              ? `Your registration has been received. See you on ${EVENT.dateEn}, ${EVENT.time} at the ${EVENT.venue}.`
              : 'Your response has been received. Thank you for letting us know.'}
          </span>
        </p>

        <div className="ref-box">
          <span className="ref-label">Reference No.</span>
          <strong className="ref-value">{result.ref}</strong>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.ref);
                setCopied(true);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? <Check width={16} height={16} /> : <Copy width={16} height={16} />}
            {copied ? 'Nakopya (Copied)' : 'Kopyahin (Copy)'}
          </button>
        </div>
        <p className="ref-note">Pakitago ang reference number na ito (Please keep this reference number for your records.)</p>

        <dl className="summary">
          <div>
            <dt>Barangay</dt>
            <dd>
              {result.data.barangay}, {result.data.city}
            </dd>
          </div>
          <div>
            <dt>Focal Person</dt>
            <dd>{result.data.focalPerson}</dd>
          </div>
          <div>
            <dt>Dadalo (Attending)</dt>
            <dd>{result.data.willAttend === 'Yes' ? 'Oo (Yes)' : 'Hindi (No)'}</dd>
          </div>
          {result.data.willAttend === 'Yes' && (
            <div>
              <dt>Mga Dadalo (Attendees)</dt>
              <dd>{result.data.attendees.map((a) => a.name).join(', ')}</dd>
            </div>
          )}
        </dl>

        <button type="button" className="btn btn-primary" onClick={reset}>
          Magsumite ng panibagong tugon (Submit another response)
        </button>
      </section>
    );
  }

  const submitting = status === 'submitting';
  const finalLabel = step === 2 || data.willAttend === 'No';

  return (
    <section className="form-card" ref={cardRef}>
      <ol className="stepper" aria-label="Form progress">
        {[
          { n: 1, fil: 'Impormasyon ng Barangay', en: 'Barangay Information' },
          { n: 2, fil: 'Mga Dadalo', en: 'Attendees' },
        ].map((s) => (
          <li
            key={s.n}
            className={`step${step === s.n ? ' is-current' : ''}${step > s.n ? ' is-done' : ''}${
              s.n === 2 && data.willAttend === 'No' ? ' is-skipped' : ''
            }`}
            aria-current={step === s.n ? 'step' : undefined}
          >
            <span className="step-drop">
              <span>{step > s.n ? <Check width={16} height={16} /> : s.n}</span>
            </span>
            <span className="step-text">
              <b>{s.fil}</b>
              <small>{s.en}</small>
            </span>
          </li>
        ))}
      </ol>
      <div className="progress" aria-hidden="true">
        <span style={{ width: step === 1 ? '50%' : '100%' }} />
      </div>

      <form onSubmit={next} noValidate>
        {/* Honeypot: hidden from people, tempting to bots. */}
        <div className="hp" aria-hidden="true">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => set('website')(e.target.value)} />
          </label>
        </div>

        {step === 1 ? (
          <div className="section" key="s1">
            <header className="section-head">
              <p className="section-kicker">Unang Bahagi (Section 1)</p>
              <h2>
                Paabiso sa Data Privacy at Impormasyon ng Barangay
                <span>Data Privacy &amp; Barangay Information</span>
              </h2>
            </header>

            <div className="privacy">
              <div className="privacy-head">
                <Shield />
                <div>
                  <b>Paabiso sa Data Privacy</b>
                  <small>Data Privacy Notice</small>
                </div>
              </div>
              <div className="privacy-body" tabIndex={0}>
                <p>
                  Ang Metropolitan Waterworks and Sewerage System – Regulatory Office (MWSS RO) ay nangangalap ng personal na
                  impormasyon sa form na ito para sa pagpaparehistro, pakikipag-ugnayan, at paghahanda para sa Barangay
                  Consultative Meeting at sa Water Efficiency Program (WEP). Maaari itong ibahagi sa mga concessionaire (Manila
                  Water Company, Inc. at Maynilad Water Services, Inc.) para lamang sa layuning ito. Ang inyong impormasyon ay
                  iingatan alinsunod sa Republic Act No. 10173 (Data Privacy Act of 2012) at hindi gagamitin sa ibang layunin nang
                  walang inyong pahintulot. Sa pagpili ng “Sumasang-ayon” (Agree), nagbibigay kayo ng pahintulot sa pagkalap at
                  pagproseso ng impormasyong ibinigay, kabilang ang PWD status ng mga dumalo, para sa mga layuning ito. Maaari
                  kayong makipag-ugnayan sa MWSS RO upang ma-access o maitama ang inyong impormasyon.
                </p>
                <p lang="en">
                  The MWSS Regulatory Office collects the personal information in this form for the registration, coordination and
                  preparation of the Barangay Consultative Meeting and the Water Efficiency Program (WEP). It may be shared with the
                  concessionaires (Manila Water Company, Inc. and Maynilad Water Services, Inc.) solely for this purpose. Your
                  information will be protected in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and will not be
                  used for any other purpose without your consent. By selecting “Agree”, you consent to the collection and
                  processing of the information provided, including attendees’ PWD status, for these purposes. You may contact MWSS
                  RO to access or correct your information.
                </p>
              </div>
              <ChoiceGroup
                name="consent"
                fil="Sumasang-ayon ka ba sa Paabiso sa Data Privacy?"
                en="Do you agree to the Data Privacy Notice?"
                required
                options={CONSENT_OPTIONS}
                value={data.consent}
                onChange={set('consent')}
                error={errors.consent}
              />
              {data.consent === 'Not Agree' && (
                <p className="callout callout-warn" role="status">
                  <Alert />
                  <span>
                    Kailangan ang inyong pahintulot upang maiproseso ang rehistro.
                    <small>Your consent is required to process the registration. Select “Agree” to continue.</small>
                  </span>
                </p>
              )}
            </div>

            <fieldset className="group" disabled={data.consent === 'Not Agree'}>
              <legend className="group-title">
                <Building />
                Impormasyon ng Barangay <small>Barangay Information</small>
              </legend>
              <div className="grid-2">
                <CitySelect
                  name="city"
                  fil="Lungsod / Bayan"
                  en="City / Municipality"
                  required
                  icon={<MapPin />}
                  value={data.city}
                  onChange={set('city')}
                  error={errors.city}
                />
                <TextField
                  name="barangay"
                  fil="Pangalan ng Barangay"
                  en="Name of Barangay"
                  required
                  placeholder="hal. Blue Ridge B"
                  value={data.barangay}
                  onChange={set('barangay')}
                  error={errors.barangay}
                />
              </div>
              <TextField
                name="hallAddress"
                fil="Lokasyon ng Barangay Hall"
                en="Address of Barangay Hall"
                required
                multiline
                maxLength={400}
                autoComplete="street-address"
                placeholder="Numero, Kalye, Barangay, Lungsod (No., Street, Barangay, City)"
                value={data.hallAddress}
                onChange={set('hallAddress')}
                error={errors.hallAddress}
              />
              <div className="grid-2">
                <TextField
                  name="brgyContact"
                  fil="Telepono / Mobile Number ng Barangay"
                  en="Barangay Contact Number"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="hal. (02) 8123-4567 o 0917 123 4567"
                  value={data.brgyContact}
                  onChange={set('brgyContact')}
                  error={errors.brgyContact}
                />
                <TextField
                  name="brgyEmail"
                  fil="Email Address ng Barangay"
                  en="Barangay Email Address"
                  optional
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="barangay@example.com"
                  value={data.brgyEmail}
                  onChange={set('brgyEmail')}
                  error={errors.brgyEmail}
                />
              </div>
              <TextField
                name="chairperson"
                fil="Pangalan ng Punong Barangay / Kapitan"
                en="Name of Barangay Chairperson"
                required
                autoComplete="off"
                placeholder="Hon. Juan Dela Cruz"
                value={data.chairperson}
                onChange={set('chairperson')}
                error={errors.chairperson}
              />
            </fieldset>

            <fieldset className="group" disabled={data.consent === 'Not Agree'}>
              <legend className="group-title">
                <Users />
                Nakatalagang Kinatawan para sa WEP <small>Focal Person for the Water Efficiency Program</small>
              </legend>
              <TextField
                name="focalPerson"
                fil="Nakatalagang Kinatawan para sa Water Efficiency Program"
                en="Focal Person for Water Efficiency Program"
                required
                autoComplete="name"
                placeholder="Buong Pangalan (Full Name)"
                value={data.focalPerson}
                onChange={set('focalPerson')}
                error={errors.focalPerson}
              />
              <div className="grid-2">
                <TextField
                  name="focalContact"
                  fil="Contact Number ng Nakatalagang Kinatawan"
                  en="Contact Number of the Focal Person"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0917 123 4567"
                  value={data.focalContact}
                  onChange={set('focalContact')}
                  error={errors.focalContact}
                />
                <TextField
                  name="focalEmail"
                  fil="Email Address ng Nakatalagang Kinatawan"
                  en="Email Address of the Focal Person"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="pangalan@example.com"
                  value={data.focalEmail}
                  onChange={set('focalEmail')}
                  error={errors.focalEmail}
                />
              </div>
            </fieldset>

            <fieldset className="group group-attend" disabled={data.consent === 'Not Agree'}>
              <ChoiceGroup
                name="willAttend"
                fil={`Pagpapatibay ng Pagdalo: Dadalo ba ang (mga) kinatawan ng inyong Barangay sa Sangguniang Pagpupulong sa ${EVENT.dateFil} (${EVENT.time}) sa ${EVENT.venue}?`}
                en={`Attendance Confirmation: Will representative/s from your Barangay attend the Consultative Meeting on ${EVENT.dateEn} (${EVENT.time}) at the ${EVENT.venue}?`}
                required
                options={YES_NO}
                value={data.willAttend}
                onChange={set('willAttend')}
                error={errors.willAttend}
              />
              {data.willAttend === 'No' && (
                <p className="callout callout-info" role="status">
                  <Info />
                  <span>
                    Salamat sa pagpapaalam. Maaari nang isumite ang inyong tugon.
                    <small>Thank you for letting us know. You can submit your response now — attendee details are not needed.</small>
                  </span>
                </p>
              )}
            </fieldset>
          </div>
        ) : (
          <div className="section" key="s2">
            <header className="section-head">
              <p className="section-kicker">Ikalawang Bahagi (Section 2)</p>
              <h2>
                Impormasyon ng mga Inaasahang Dadalo
                <span>Delegate / Attendee Information</span>
              </h2>
            </header>
            <p className="callout callout-info">
              <Info />
              <span>
                Hanggang dalawang (2) kinatawan bawat barangay.
                <small>Up to two (2) representatives per barangay. The second attendee is optional.</small>
              </span>
            </p>

            {[0, 1].map((i) => {
              const a = data.attendees[i];
              const k = (f: string) => `attendees.${i}.${f}`;
              const ordinal = i === 0 ? { fil: 'Unang', en: '1' } : { fil: 'Pangalawang', en: '2' };
              return (
                <fieldset className="group attendee" key={i}>
                  <legend className="group-title">
                    <span className="attendee-badge">{i + 1}</span>
                    {i === 0 ? 'Unang Dadalo' : 'Pangalawang Dadalo'} <small>Attendee {i + 1}</small>
                    {i === 1 && <span className="opt">Opsyonal (Optional)</span>}
                    {i === 1 && !attendeeIsBlank(a) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm attendee-clear"
                        onClick={() => setData((d) => ({ ...d, attendees: [d.attendees[0], blankAttendee()] }))}
                      >
                        Burahin (Clear)
                      </button>
                    )}
                  </legend>
                  <div className="grid-2">
                    <TextField
                      name={k('name')}
                      fil={`Pangalan ng ${ordinal.fil} Dadalo`}
                      en={`Name of attendee ${ordinal.en}`}
                      required={i === 0}
                      autoComplete="off"
                      placeholder="Buong Pangalan (Full Name)"
                      value={a.name}
                      onChange={setAtt(i, 'name')}
                      error={errors[k('name')]}
                    />
                    <TextField
                      name={k('contact')}
                      fil="Contact Number"
                      en="Mobile or landline number"
                      required={i === 0}
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="0917 123 4567"
                      value={a.contact}
                      onChange={setAtt(i, 'contact')}
                      error={errors[k('contact')]}
                    />
                  </div>
                  <ChoiceGroup
                    name={k('gender')}
                    fil="Kasarian"
                    en="Gender"
                    required={i === 0}
                    columns={3}
                    options={GENDERS}
                    value={a.gender}
                    onChange={setAtt(i, 'gender')}
                    error={errors[k('gender')]}
                  />
                  <ChoiceGroup
                    name={k('pwd')}
                    fil="Ang dadalo ba ay kabilang sa sektor ng Persons with Disability (PWD)?"
                    en="Is this attendee a member of the PWD sector?"
                    required={i === 0}
                    options={YES_NO}
                    value={a.pwd}
                    onChange={setAtt(i, 'pwd')}
                    error={errors[k('pwd')]}
                  />
                </fieldset>
              );
            })}
          </div>
        )}

        {serverError && (
          <p className="callout callout-error" role="alert">
            <Alert />
            <span>{serverError}</span>
          </p>
        )}

        <div className="actions">
          {step === 2 ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={submitting}
              onClick={() => {
                setStep(1);
                setErrors(attempted[1] ? validateStep1(data) : {});
                window.requestAnimationFrame(scrollToCard);
              }}
            >
              <ArrowLeft />
              Bumalik (Back)
            </button>
          ) : (
            <span className="actions-note">
              <span className="req">*</span> Kinakailangan (Required)
            </span>
          )}
          <button
            type="submit"
            className={`btn btn-primary${submitting ? ' is-loading' : ''}`}
            disabled={submitting || data.consent === 'Not Agree'}
          >
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Isinusumite… (Submitting…)
              </>
            ) : finalLabel ? (
              <>
                Isumite (Submit)
                <Check />
              </>
            ) : (
              <>
                Susunod (Next)
                <ArrowRight />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
