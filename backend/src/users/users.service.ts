import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '@/auth/dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        role: data.role.toUpperCase() as any,
        status: data.status.toUpperCase() as any,
        passwordHash,
      },
    });
    return this.mapToDto(user);
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
        ...(data.role && { role: data.role.toUpperCase() as any }),
        ...(data.status && { status: data.status.toUpperCase() as any }),
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

  private mapToDto(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status.toLowerCase(),
      role: user.role.toLowerCase(),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
