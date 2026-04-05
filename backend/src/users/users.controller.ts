import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from '@/auth/dto';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  async getAll(
    @Query('status') status?: string,
    @Query('role') role?: string,
  ): Promise<UserResponseDto[]> {
    const users = await this.usersService.getAll({ status, role });
    return users.map((user: any) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status.toLowerCase() as 'active' | 'inactive',
      role: user.role.toLowerCase() as 'admin' | 'staff',
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  @Get(':id')
  @UseGuards(SessionAuthGuard)
  async getById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status.toLowerCase() as 'active' | 'inactive',
      role: user.role.toLowerCase() as 'admin' | 'staff',
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
