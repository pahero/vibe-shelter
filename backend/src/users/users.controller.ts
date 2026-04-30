import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserResponseDto } from '@/auth/dto';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'], description: 'Filter by user status' })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'staff'], description: 'Filter by user role' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: 'uuid-1234' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'User not found' })
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
