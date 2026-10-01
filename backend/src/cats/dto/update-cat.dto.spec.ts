import { BadRequestException } from '@nestjs/common';
import { UpdateCatDto } from './update-cat.dto';

describe('UpdateCatDto.toCommand', () => {
  it('normalizes all populated fields into a flat update command', () => {
    const dto = Object.assign(new UpdateCatDto(), {
      name: '  Luna  ', sex: 'FEMALE', color: '  Black  ',
      estimatedBirthDate: '2020-01-02', intakeDate: '2024-03-04', rescueSource: '  Clinic  ',
      microchipNumber: '  chip  ', passportNumber: '  passport  ', adopterName: '  Foster  ',
      adopterAddress: '  Address  ', felvFivTestDone: true, sterilizationStatus: 'STERILIZED', currentLocationId: 'location-id',
    });
    expect(dto.toCommand()).toEqual({
      name: 'Luna', sex: 'FEMALE', color: 'Black',
      estimatedBirthDate: new Date('2020-01-02'), intakeDate: new Date('2024-03-04'), rescueSource: 'Clinic',
      microchipNumber: 'chip', passportNumber: 'passport', adopterName: 'Foster', adopterAddress: 'Address',
      felvFivTestDone: true, sterilizationStatus: 'STERILIZED', currentLocationId: 'location-id',
    });
  });

  it('returns an empty command when every field is omitted', () => {
    expect(new UpdateCatDto().toCommand()).toEqual({});
  });

  it('normalizes empty nullable text, dates, and location IDs to null', () => {
    const dto = Object.assign(new UpdateCatDto(), {
      color: '   ', estimatedBirthDate: '', intakeDate: null, rescueSource: null,
      microchipNumber: ' ', passportNumber: null, adopterName: '', adopterAddress: ' ', currentLocationId: '',
    });
    expect(dto.toCommand()).toEqual({
      color: null, estimatedBirthDate: null, intakeDate: null, rescueSource: null,
      microchipNumber: null, passportNumber: null, adopterName: null, adopterAddress: null, currentLocationId: null,
    });
  });

  it('rejects a blank cat name', () => {
    const dto = Object.assign(new UpdateCatDto(), { name: '   ' });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });

  it('rejects an invalid estimated birth date', () => {
    const dto = Object.assign(new UpdateCatDto(), { estimatedBirthDate: 'not-a-date' });
    expect(() => dto.toCommand()).toThrow('estimatedBirthDate must be a valid date');
  });

  it('rejects an invalid intake date', () => {
    const dto = Object.assign(new UpdateCatDto(), { intakeDate: 'not-a-date' });
    expect(() => dto.toCommand()).toThrow('intakeDate must be a valid date');
  });

  it('rejects an invalid sex', () => {
    const dto = Object.assign(new UpdateCatDto(), { sex: 'UNKNOWN_VALUE' });
    expect(() => dto.toCommand()).toThrow('Invalid sex');
  });

  it('rejects an invalid sterilization status', () => {
    const dto = Object.assign(new UpdateCatDto(), { sterilizationStatus: 'UNKNOWN_VALUE' });
    expect(() => dto.toCommand()).toThrow('Invalid sterilizationStatus');
  });
});
