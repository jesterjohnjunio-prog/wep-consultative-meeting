import 'server-only';
import ExcelJS from 'exceljs';
import { EVENT } from './config';
import { computeStats, duplicateKey, findDuplicates, formatDateTime } from './stats';
import type { Registration } from './types';

type Row = Record<string, string | number>;

function registrationRows(rows: Registration[]): Row[] {
  const dups = findDuplicates(rows);
  return rows.map((r) => {
    const [a1, a2] = [r.attendees[0], r.attendees[1]];
    return {
      'Reference No.': r.ref,
      'Submitted At': formatDateTime(r.submittedAt),
      Province: r.province,
      'City/Municipality': r.city,
      Barangay: r.barangay,
      'Barangay Hall Address': r.hallAddress,
      'Barangay Contact Number': r.brgyContact,
      'Barangay Email': r.brgyEmail,
      'Barangay Chairperson': r.chairperson,
      'Focal Person': r.focalPerson,
      'Focal Person Contact Number': r.focalContact,
      'Focal Person Email': r.focalEmail,
      'Will Attend': r.willAttend,
      'No. of Attendees': r.willAttend === 'Yes' ? r.attendees.length : 0,
      'Attendee 1 Name': a1?.name ?? '',
      'Attendee 1 Contact Number': a1?.contact ?? '',
      'Attendee 1 Gender': a1?.gender ?? '',
      'Attendee 1 PWD': a1?.pwd ?? '',
      'Attendee 2 Name': a2?.name ?? '',
      'Attendee 2 Contact Number': a2?.contact ?? '',
      'Attendee 2 Gender': a2?.gender ?? '',
      'Attendee 2 PWD': a2?.pwd ?? '',
      'Data Privacy Consent': r.consent,
      'Possible Duplicate': dups.has(duplicateKey(r)) ? 'Yes' : '',
    };
  });
}

function attendeeRows(rows: Registration[]): Row[] {
  const out: Row[] = [];
  for (const r of rows) {
    if (r.willAttend !== 'Yes') continue;
    for (const a of r.attendees) {
      out.push({
        'No.': out.length + 1,
        'Attendee Name': a.name,
        'Contact Number': a.contact,
        Gender: a.gender,
        PWD: a.pwd,
        Barangay: r.barangay,
        'City/Municipality': r.city,
        Province: r.province,
        'Reference No.': r.ref,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- CSV

const PHONE_LIKE = /^[0-9+()\-.\s/,]+$/;

function csvCell(v: string | number) {
  let s = String(v ?? '');
  // Neutralise spreadsheet formulas (CSV injection) without mangling phone numbers like +63 917…
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !PHONE_LIKE.test(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[], headers: string[]) {
  const lines = [headers.map(csvCell).join(',')];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h] ?? '')).join(','));
  // BOM so Excel opens Ñ / ñ correctly.
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function registrationsCsv(rows: Registration[]) {
  const data = registrationRows(rows);
  return toCsv(data, Object.keys(data[0] ?? registrationRows([emptyRegistration()])[0]));
}

export function attendeesCsv(rows: Registration[]) {
  const headers = ['No.', 'Attendee Name', 'Contact Number', 'Gender', 'PWD', 'Barangay', 'City/Municipality', 'Province', 'Reference No.'];
  return toCsv(attendeeRows(rows), headers);
}

function emptyRegistration(): Registration {
  return {
    id: '', ref: '', submittedAt: '', consent: '', province: '', city: '', barangay: '', hallAddress: '',
    brgyContact: '', brgyEmail: '', chairperson: '', focalPerson: '', focalContact: '', focalEmail: '',
    willAttend: '', attendeeCount: 0, attendees: [],
  };
}

// ---------------------------------------------------------------- Excel

const OCEAN = 'FF0A4D8C';
const AQUA_TINT = 'FFE6F5FC';
const BORDER = { style: 'thin' as const, color: { argb: 'FFD3E2EE' } };

function addTableSheet(wb: ExcelJS.Workbook, name: string, rows: Row[], headers: string[], widths: Record<string, number> = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = headers.map((h) => ({ header: h, key: h, width: widths[h] ?? Math.min(Math.max(h.length + 4, 14), 40) }));
  for (const r of rows) ws.addRow(r);
  const header = ws.getRow(1);
  header.height = 30;
  header.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OCEAN } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });
  ws.eachRow((row, i) => {
    if (i === 1) return;
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = { bottom: BORDER };
      if (i % 2 === 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AQUA_TINT } };
    });
  });
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  return ws;
}

async function fetchImage(origin: string, path: string) {
  try {
    const res = await fetch(new URL(path, origin), { cache: 'force-cache' });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function buildWorkbook(rows: Registration[], filterLabel: string, origin: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MWSS RO Water Efficiency Program';
  wb.created = new Date();
  const stats = computeStats(rows);

  // Summary
  const ws = wb.addWorksheet('Summary', { properties: { tabColor: { argb: OCEAN } } });
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 22 }, { width: 22 }];
  const [mwss, wep] = await Promise.all([fetchImage(origin, '/mwss-ro-logo.png'), fetchImage(origin, '/wep-logo.png')]);
  let top = 1;
  if (mwss && wep) {
    // The MWSS RO logo has white lettering, so it sits on an ocean-blue band.
    for (let r = 1; r <= 3; r++) {
      ws.getRow(r).height = r === 2 ? 34 : 14;
      for (let c = 1; c <= 4; c++) {
        ws.getRow(r).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF03316A' } };
      }
    }
    ws.addImage(wb.addImage({ buffer: mwss as unknown as ExcelJS.Buffer, extension: 'png' }), {
      tl: { col: 0.08, row: 0.35 },
      ext: { width: 264, height: 57 },
    });
    ws.addImage(wb.addImage({ buffer: wep as unknown as ExcelJS.Buffer, extension: 'png' }), {
      tl: { col: 1.35, row: 0.25 },
      ext: { width: 44, height: 60 },
    });
    top = 5;
  }
  const line = (text: string, font: Partial<ExcelJS.Font>) => {
    const c = ws.getCell(`A${top}`);
    c.value = text;
    c.font = font;
    ws.mergeCells(`A${top}:D${top}`);
    top += 1;
  };
  line('BARANGAY CONSULTATIVE MEETING', { bold: true, size: 16, color: { argb: OCEAN } });
  line('MWSS RO WATER EFFICIENCY PROGRAM', { bold: true, size: 12, color: { argb: 'FF1677C9' } });
  line(`${EVENT.dateEn} · ${EVENT.time} · ${EVENT.venue}`, { size: 10, color: { argb: 'FF44566B' } });
  line(`Generated ${formatDateTime(new Date().toISOString())} · ${filterLabel}`, { italic: true, size: 9, color: { argb: 'FF6B7C8F' } });
  top += 1;

  const section = (title: string, headers: string[], body: (string | number)[][]) => {
    const t = ws.getCell(`A${top}`);
    t.value = title;
    t.font = { bold: true, size: 12, color: { argb: OCEAN } };
    top += 1;
    const h = ws.getRow(top);
    headers.forEach((v, i) => {
      const c = h.getCell(i + 1);
      c.value = v;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OCEAN } };
    });
    top += 1;
    for (const r of body) {
      const row = ws.getRow(top);
      r.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v;
        c.border = { bottom: BORDER };
      });
      top += 1;
    }
    top += 1;
  };

  section('Key figures', ['Metric', 'Value'], [
    ['Registered barangays', stats.total],
    ['Will attend', stats.attending],
    ['Will not attend', stats.notAttending],
    ['Expected attendees', stats.expectedAttendees],
    ['Target capacity', EVENT.capacity],
    ['Women attendees', stats.gender.find((g) => g.label === 'Female')?.value ?? 0],
    ['PWD attendees', stats.pwd],
    ['Possible duplicate registrations', stats.duplicates],
  ]);
  section('Attendee gender', ['Gender', 'Attendees'], stats.gender.map((g) => [g.label, g.value]));
  section(
    'Registrations by city / municipality',
    ['City / Municipality', 'Province', 'Registrations', 'Expected attendees'],
    stats.byCity.map((c) => [c.city, c.province, c.count, c.attendees]),
  );

  // Data sheets
  const reg = registrationRows(rows);
  const regHeaders = Object.keys(reg[0] ?? registrationRows([emptyRegistration()])[0]);
  addTableSheet(wb, 'Registrations', reg, regHeaders, {
    'Reference No.': 16,
    'Submitted At': 22,
    Barangay: 24,
    'Barangay Hall Address': 40,
    'Barangay Email': 28,
    'Focal Person Email': 28,
    'Attendee 1 Name': 26,
    'Attendee 2 Name': 26,
  });
  const att = attendeeRows(rows);
  addTableSheet(
    wb,
    'Attendees',
    att,
    ['No.', 'Attendee Name', 'Contact Number', 'Gender', 'PWD', 'Barangay', 'City/Municipality', 'Province', 'Reference No.'],
    { 'No.': 6, 'Attendee Name': 30, Barangay: 26, PWD: 8 },
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}
