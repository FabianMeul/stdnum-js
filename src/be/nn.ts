// TODO: Add reference to GNU Lesser General Public License
// From https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/be/nn.py

import * as exceptions from '../exceptions';
import { strings, isValidDateCompactYYYYMMDD } from '../util';
import { Validator, ValidateReturn } from '../types';

function clean(input: string): ReturnType<typeof strings.cleanUnicode> {
  return strings.cleanUnicode(input, ' -.');
}

const impl: Validator = {
  name: 'Belgian National Number',
  localName: 'Numéro National',
  abbreviation: 'NN, NISS',
  compact(input: string): string {
    const [value, err] = clean(input);

    if (err) {
      throw err;
    }

    return value;
  },
  format(input: string): string {
    const [value] = clean(input);
    return value;
  },
  validate(input: string): ValidateReturn {
    const number = compact(input);

    if (!strings.isdigits(number) || parseInt(number, 10) <= 0) {
      return { isValid: false, error: new exceptions.InvalidFormat() }
    }

    if (number.length !== 11) {
      return { isValid: false, error: new exceptions.InvalidLength() }
    }

    if (!validStructure(number)) {
      return { isValid: false, error: new exceptions.InvalidFormat() }
    }

    if (!validChecksum(number)) {
      return { isValid: false, error: new exceptions.InvalidChecksum() }
    }

    return {
      isValid: true,
      compact: number,
      isIndividual: true,
      isCompany: false,
    }
  }
}

export const {
  name,
  localName,
  abbreviation,
  validate,
  format,
  compact,
} = impl;

function isValidFirstSix(firstSix: string): boolean {
  if (isCompletelyUnknownDob(firstSix) || isDobWithOnlyYearKnown(firstSix)) return true;
  return isValidDob(firstSix);
}

function isCompletelyUnknownDob(dob: string): boolean {
  return (dob === '000001');
}

function isDobWithOnlyYearKnown(dob: string): boolean {
  const [yy, mm, dd] = toDateArray(dob);
  return (strings.isdigits(yy) && mm === '00' && dd === '00');
}

function isValidDob(dob: string): boolean {
  return Boolean(getValidPastDates(dob).length);
}

function getValidPastDates(yymmdd: string): Array<string> {
  const [yy, mm, dd] = toDateArray(yymmdd);
  const approximatelyNow = getApproximatelyNow();
  return ['19', '20'].
    map(c => `${c}${yy}`).
    filter((yyyy) => isValidDateCompactYYYYMMDD(`${yyyy}${mm}${dd}`)).
    map((yyyy) => `${yyyy}-${mm}-${dd}`).
    filter((date) => new Date(date) <= approximatelyNow);
}

function getApproximatelyNow() {
  const ONE_DAY = 1000 * 60 * 60 * 24;
  return new Date(Date.now() + ONE_DAY);
}

function validStructure(number: string): boolean {
  const firstSix = getFirstSix(number);
  return isValidFirstSix(firstSix);
}

function validChecksum(number: string): boolean {
  const checksumBases = getChecksumBases(number);
  const [, checksum] = getBaseNumberAndChecksum(number);
  return checksumBases.some(csb => csb % 97 + checksum === 97);
}

function getChecksumBases(number: string): Array<number> {
  const firstSix = getFirstSix(number);
  const [baseNumber] = getBaseNumberAndChecksum(number);

  if (isCompletelyUnknownDob(firstSix)) return [baseNumber];

  if (isDobWithOnlyYearKnown(firstSix)) return getBaseNumbersForOnlyYearKnown(firstSix, baseNumber);

  return getChecksumBasesForStandardDate(firstSix, baseNumber);
}

function getChecksumBasesForStandardDate(firstSix: string, baseNumber: number): Array<number> {
  const validPastDates = getValidPastDates(firstSix);
  const extractYearFromDate = (date: string): number => parseInt(date.split('-')[0], 10);
  const validPastYears = validPastDates.map(extractYearFromDate);

  return validPastYears.map(year => toChecksumBasis(year, baseNumber));
}

function getBaseNumbersForOnlyYearKnown(firstSix: string, baseNumber: number): Array<number> {
  const [yy] = toDateArray(firstSix);
  const toYear = (prefix: string): number => parseInt(`${prefix}${yy}`, 10);
  return ['19', '20'].map(toYear).filter(yearHasStarted).map(year => toChecksumBasis(year, baseNumber));
}

function yearHasStarted(year: number): boolean {
  const startOfYear = new Date(`${year}`);
  return startOfYear <= getApproximatelyNow();
}

function toChecksumBasis(year: number, baseNumber: number): number {
  const twoPrefixedBaseNumber = parseInt(`${2}${baseNumber}`, 10);
  return year < 2000 ? baseNumber : twoPrefixedBaseNumber
}

function getFirstSix(number: string): string {
  return strings.splitAt(number, 6)[0];
}

function getBaseNumberAndChecksum(number: string): Array<number> {
  return strings.splitAt(number, 9).map(n => parseInt(n, 10));
}

function toDateArray(number: string): Array<string> {
  return strings.splitAt(number, 2, 4);
}
