import { BadRequestException } from '@nestjs/common';
import { CreateCatDto } from './create-cat.dto';

describe('CreateCatDto', () => {
  it('parses every request field into a flat command', () => {
    const dto = new CreateCatDto();
    dto.name = '  Mila  ';
    dto.sex = 'FEMALE';
    dto.color = '  Calico  ';
    dto.estimatedBirthDate = '2024-03-15';
    dto.intakeDate = '2026-04-01';
    dto.rescueSource = '  Found near clinic  ';
    dto.microchipNumber = '  900123456789012  ';
    dto.passportNumber = '  AB123456  ';
    dto.sterilizationStatus = 'STERILIZED';
    dto.currentLocationId = '  location-1  ';

    const command = dto.toCommand({
      id: 'user-1',
      email: 'staff@example.com',
      fullName: 'Shelter Staff',
      role: 'STAFF',
    });

    expect(command).toMatchObject({
      name: 'Mila',
      sex: 'FEMALE',
      color: 'Calico',
      estimatedBirthDate: new Date('2024-03-15'),
      intakeDate: new Date('2026-04-01'),
      rescueSource: 'Found near clinic',
      microchipNumber: '900123456789012',
      passportNumber: 'AB123456',
      sterilizationStatus: 'STERILIZED',
      currentLocationId: 'location-1',
      actorUserId: 'user-1',
      actorEmail: 'staff@example.com',
      actorName: 'Shelter Staff',
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty', ''],
  ])('normalizes %s optional values and dates to null', (_label, value) => {
    const dto = createRequiredDto();
    dto.color = value;
    dto.estimatedBirthDate = value;
    dto.intakeDate = value;
    dto.rescueSource = value;
    dto.microchipNumber = value;
    dto.passportNumber = value;
    dto.currentLocationId = value;

    expect(dto.toCommand()).toMatchObject({
      color: null,
      estimatedBirthDate: null,
      intakeDate: null,
      rescueSource: null,
      microchipNumber: null,
      passportNumber: null,
      currentLocationId: null,
      actorUserId: null,
      actorEmail: null,
      actorName: null,
    });
  });

  it('normalizes whitespace-only optional strings and a null actor name', () => {
    const dto = createRequiredDto();
    dto.color = '   ';

    const command = dto.toCommand({
      id: 'user-1',
      email: 'staff@example.com',
      fullName: null,
      role: 'STAFF',
    });

    expect(command.color).toBeNull();
    expect(command.actorName).toBeNull();
  });

  it.each([undefined, '', '   '])('rejects an absent or empty name: %p', (name) => {
    const dto = createRequiredDto();
    dto.name = name as string;

    expect(() => dto.toCommand()).toThrow(new BadRequestException('Cat name is required'));
  });

  it.each([
    ['sex', 'OTHER', 'Invalid sex. Must be one of: FEMALE, MALE, UNKNOWN'],
    [
      'sterilizationStatus',
      'OTHER',
      'Invalid sterilizationStatus. Must be one of: STERILIZED, NOT_STERILIZED, UNKNOWN',
    ],
  ])('rejects an invalid %s', (field, value, message) => {
    const dto = createRequiredDto();
    Object.assign(dto, { [field]: value });

    expect(() => dto.toCommand()).toThrow(new BadRequestException(message));
  });

  it.each(['estimatedBirthDate', 'intakeDate'] as const)(
    'rejects an invalid %s',
    (field) => {
      const dto = createRequiredDto();
      dto[field] = 'not-a-date';

      expect(() => dto.toCommand()).toThrow(
        new BadRequestException(`${field} must be a valid date`),
      );
    },
  );

  it.each([
    ['FEMALE', 'STERILIZED'],
    ['MALE', 'NOT_STERILIZED'],
    ['UNKNOWN', 'UNKNOWN'],
  ])('maps supported enum values %s and %s', (sex, sterilizationStatus) => {
    const dto = createRequiredDto();
    dto.sex = sex;
    dto.sterilizationStatus = sterilizationStatus;

    expect(dto.toCommand()).toMatchObject({ sex, sterilizationStatus });
  });
});

function createRequiredDto(): CreateCatDto {
  const dto = new CreateCatDto();
  dto.name = 'Mila';
  dto.sex = 'FEMALE';
  dto.sterilizationStatus = 'STERILIZED';
  return dto;
}