import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '@/auth/dto';
import * as bcrypt from 'bcrypt';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDto): Promise<UserResponseDto> {
    if (!data.password?.trim()) {
      throw new BadRequestException('Password is required');
    }

    if (typeof data.isTest !== 'boolean') {
      throw new BadRequestException('Test user marker is required');
    }

    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          fullName: data.fullName,
          role: data.role.toUpperCase() as UserRole,
          status: data.status.toUpperCase() as UserStatus,
          passwordHash,
          isTest: data.isTest,
        },
      });
      return this.mapToDto(user);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async getAll(filters?: { status?: string; role?: string }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.status && { status: filters.status.toUpperCase() as any }),
        ...(filters?.role && { role: filters.role.toUpperCase() as any }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.role && { role: data.role.toUpperCase() as UserRole }),
        ...(data.status && { status: data.status.toUpperCase() as UserStatus }),
        ...(passwordHash && { passwordHash }),
      },
    });
    return this.mapToDto(user);
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  private mapToDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status.toLowerCase() as 'active' | 'inactive',
      role: user.role.toLowerCase() as 'admin' | 'staff',
      isTest: user.isTest,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
