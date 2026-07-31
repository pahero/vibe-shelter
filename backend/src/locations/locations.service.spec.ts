// src/locations/locations.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  let prisma: any;

  beforeEach(async () => {
    // Mock Prisma service
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      location: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  describe('createLocation', () => {
    it('should validate location type', async () => {
      await expect(
        service.createLocation({
          name: 'Test',
          type: 'INVALID',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty name', async () => {
      await expect(
        service.createLocation({
          name: '',
          type: 'SHELTER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate owner exists if provided', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createLocation({
          name: 'Foster',
          type: 'FOSTER',
          ownerId: 'invalid-user',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException for non-existent location', async () => {
      prisma.location.findUnique.mockResolvedValue(null);

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
    it('should reject invalid type filter', async () => {
      await expect(
        service.findAll({ type: 'INVALID' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid status filter', async () => {
      await expect(
        service.findAll({ status: 'INVALID' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateLocation', () => {
    it('updates description and normalizes blank owner id to null', async () => {
      const location = { id: 'location-id', name: 'Shelter', ownerId: null };
      prisma.location.findUnique.mockResolvedValueOnce(location);
      prisma.location.update.mockResolvedValue({ ...location, description: 'Updated' });

      await service.updateLocation('location-id', {
        description: ' Updated ',
        ownerId: '',
      });

      expect(prisma.location.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Updated', ownerId: null }),
        }),
      );
    });
  });

  describe('validation methods', () => {
    it('should validate location type', async () => {
      expect(await service.validateLocationTypeValid('SHELTER')).toBe(true);
      expect(await service.validateLocationTypeValid('CLINIC')).toBe(true);
      expect(await service.validateLocationTypeValid('FOSTER')).toBe(true);
      expect(await service.validateLocationTypeValid('INVALID')).toBe(false);
    });
  });
});
