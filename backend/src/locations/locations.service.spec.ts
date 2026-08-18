import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { beginTestTransaction, rollbackTestTransaction, startTestDatabase } from '../test-utils/test-db';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    service = new LocationsService(prisma);
  });

  beforeEach(async () => {
    await beginTestTransaction(prisma);
  });

  afterEach(async () => {
    await rollbackTestTransaction(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createLocation', () => {
    it('should reject empty name', async () => {
      await expect(
        service.createLocation({
          name: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate owner exists if provided', async () => {
      await expect(
        service.createLocation({
          name: 'Foster',
          ownerId: 'invalid-user',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates locations with the current user test status', async () => {
      const regular = await service.createLocation({ name: `Regular ${unique()}` }, false);
      const test = await service.createLocation({ name: `Test ${unique()}` }, true);

      expect(regular.isTest).toBe(false);
      expect(test.isTest).toBe(true);
      await expect(prisma.location.findUniqueOrThrow({ where: { id: regular.id } })).resolves.toMatchObject({ isTest: false });
      await expect(prisma.location.findUniqueOrThrow({ where: { id: test.id } })).resolves.toMatchObject({ isTest: true });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException for non-existent location', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject empty id', async () => {
      await expect(service.findById('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('hides opposite-status locations by id', async () => {
      const location = await prisma.location.create({
        data: { name: `Hidden ${unique()}`, isTest: true },
      });

      await expect(service.findById(location.id, false)).rejects.toThrow(NotFoundException);
      await expect(service.findById(location.id, true)).resolves.toMatchObject({ id: location.id });
    });
  });

  describe('findAll', () => {
    it('should reject invalid status filter', async () => {
      await expect(
        service.findAll({ status: 'INVALID' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('filters lists and owner lookups by current user test status', async () => {
      const owner = await prisma.user.create({
        data: { email: `${unique()}@example.com`, status: 'ACTIVE' },
      });
      const regular = await service.createLocation({ name: `Regular ${unique()}`, ownerId: owner.id }, false);
      const test = await service.createLocation({ name: `Test ${unique()}`, ownerId: owner.id }, true);

      await service.findAll({ ownerId: owner.id }, false);
      await service.findAll({ ownerId: owner.id }, true);
      const regularOwnerList = await service.findByOwnerId(owner.id, false);
      const testOwnerList = await service.findByOwnerId(owner.id, true);

      expect(regularOwnerList.map((location: { id: string }) => location.id)).toEqual([regular.id]);
      expect(testOwnerList.map((location: { id: string }) => location.id)).toEqual([test.id]);
    });
  });

  describe('updateLocation', () => {
    it('updates description and normalizes blank owner id to null', async () => {
      const location = await prisma.location.create({
        data: { name: `Shelter ${unique()}`, ownerId: null },
      });

      await service.updateLocation(location.id, {
        description: ' Updated ',
        ownerId: '',
      }, false);

      const updated = await prisma.location.findUniqueOrThrow({ where: { id: location.id } });
      expect(updated.description).toBe('Updated');
      expect(updated.ownerId).toBeNull();
    });

    it('hides opposite-status locations from updates and archives', async () => {
      const location = await prisma.location.create({
        data: { name: `Test ${unique()}`, isTest: true },
      });

      await expect(service.updateLocation(location.id, { description: 'Nope' }, false)).rejects.toThrow(NotFoundException);
      await expect(service.archiveLocation(location.id, false)).rejects.toThrow(NotFoundException);
      await service.archiveLocation(location.id, true);
      await expect(prisma.location.findUniqueOrThrow({ where: { id: location.id } })).resolves.toMatchObject({ status: 'ARCHIVED' });
    });
  });

});

function unique(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
