import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';
import { AdminRoleGuard } from '@/auth/guards/admin-role.guard';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '@/auth/dto';

@Controller('admin/users')
@UseGuards(SessionAuthGuard, AdminRoleGuard)
export class AdminUsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  async getAll(
    @Query('status') status?: string,
    @Query('role') role?: string,
  ): Promise<UserResponseDto[]> {
    const users = await this.usersService.getAll({ status, role });
    return users.map((user) => ({
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

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Patch(':id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' },
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, { status: body.status });
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    await this.usersService.deleteUser(id);
    return { message: 'User deleted successfully' };
  }
}
