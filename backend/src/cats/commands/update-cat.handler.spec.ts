import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { UpdateCatHandler } from './update-cat.handler';

describe('UpdateCatHandler', () => {
  const s3 = new S3Client({ region: 'us-east-1', credentials: { accessKeyId: 'unit-test', secretAccessKey: 'unit-test' } });
  const urls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it('updates fields and writes scalar audit values for changed fields only', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const location = await tx.location.create({ data: { name: `Location ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      const cat = await tx.cat.create({ data: { name: 'Mila', adopterName: null } });
      const result = await new UpdateCatHandler(tx as PrismaService, urls).handle(cat.id, {
        name: 'Luna', sex: 'FEMALE', color: 'Black', estimatedBirthDate: new Date('2020-01-02'), intakeDate: new Date('2024-03-04'),
        rescueSource: 'Clinic', microchipNumber: `chip-${Date.now()}-${Math.random().toString(36).slice(2)}`, passportNumber: `passport-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        adopterName: 'Foster', adopterAddress: 'Address', felvFivTestDone: true,
        sterilizationStatus: 'STERILIZED', currentLocationId: location.id,
      }, actor.id, false);
      expect(result).toMatchObject({
        id: cat.id, name: 'Luna', sex: 'FEMALE', color: 'Black', adopterName: 'Foster', adopterAddress: 'Address',
        felvFivTestDone: true, currentLocationId: location.id, microchipNumber: expect.stringContaining('chip-'),
        passportNumber: expect.stringContaining('passport-'), rescueSource: 'Clinic', sterilizationStatus: 'STERILIZED',
      });
      await expect(tx.location.findUniqueOrThrow({ where: { id: location.id } })).resolves.toMatchObject({ version: 1 });
      const events = await tx.catAuditEvent.findMany({ where: { catId: cat.id } });
      expect(events).toHaveLength(13);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ eventType: 'name_changed', oldValue: 'Mila', newValue: 'Luna' }),
        expect.objectContaining({ eventType: 'adopter_name_changed', oldValue: 'Not set', newValue: 'Foster' }),
        expect.objectContaining({ eventType: 'felv_fiv_test_done_changed', oldValue: 'false', newValue: 'true' }),
        expect.objectContaining({ eventType: 'current_location_changed', oldValue: 'Not set', newValue: location.name }),
      ]));
    });
  });

  it('clears nullable fields and audits the human-readable unset value', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`, color: 'Black' } });
      await new UpdateCatHandler(tx as PrismaService, urls).handle(cat.id, { color: null }, actor.id, false);
      await expect(tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id } })).resolves.toMatchObject({ eventType: 'color_changed', oldValue: 'Black', newValue: 'Not set' });
    });
  });

  it('rejects a cat outside the current partition', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new UpdateCatHandler(tx as PrismaService, urls).handle(cat.id, { name: 'Changed' }, undefined, false)).rejects.toThrow(NotFoundException);
    });
  });

  it('rejects a location in the opposite partition', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      const location = await tx.location.create({ data: { name: `Test location ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new UpdateCatHandler(tx as PrismaService, urls).handle(cat.id, { currentLocationId: location.id }, undefined, false)).rejects.toThrow(NotFoundException);
    });
  });

  it('rejects duplicate microchip and passport values', async () => {
    await runInTestTransaction(async (tx) => {
      const existing = await tx.cat.create({ data: { name: `Existing ${Date.now()}-${Math.random().toString(36).slice(2)}`, microchipNumber: `chip-${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      const target = await tx.cat.create({ data: { name: `Target ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      await expect(new UpdateCatHandler(tx as PrismaService, urls).handle(target.id, { microchipNumber: existing.microchipNumber }, undefined, false)).rejects.toThrow(ConflictException);
    });
  });

  it('does not create audit events for a no-op update', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const cat = await tx.cat.create({ data: { name: 'Same' } });
      await new UpdateCatHandler(tx as PrismaService, urls).handle(cat.id, { name: 'Same' }, actor.id, false);
      await expect(tx.catAuditEvent.count({ where: { catId: cat.id } })).resolves.toBe(0);
    });
  });
});
