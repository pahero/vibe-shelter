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
  });

  describe('findAll', () => {
    it('should reject invalid status filter', async () => {
      await expect(
        service.findAll({ status: 'INVALID' }),
      ).rejects.toThrow(BadRequestException);
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
      });

      const updated = await prisma.location.findUniqueOrThrow({ where: { id: location.id } });
      expect(updated.description).toBe('Updated');
      expect(updated.ownerId).toBeNull();
    });
  });

});

function unique(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
