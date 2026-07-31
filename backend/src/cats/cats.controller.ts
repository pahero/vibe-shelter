import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CatsService, PrimaryPhotoUpload } from './cats.service';
import { CreateCatDto, CreateCatWeightDto, UpdateCatDto } from './dto';

@Controller('api/cats')
@UseGuards(SessionAuthGuard)
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Get()
  async listCats(
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catsService.findAll({
      locationId,
      status,
      search,
      skip: skip === undefined ? undefined : Number(skip),
      limit: limit === undefined ? undefined : Number(limit),
    });
  }

  @Get(':id/card')
  async getCatCard(@Param('id') id: string) {
    return this.catsService.findCardById(id);
  }

  @Get(':id/weights')
  async listWeights(@Param('id') id: string) {
    return this.catsService.listWeights(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCat(@Body() dto: CreateCatDto) {
    return this.catsService.createCat(dto);
  }

  @Patch(':id')
  async updateCat(@Param('id') id: string, @Body() dto: UpdateCatDto) {
    return this.catsService.updateCat(id, dto);
  }

  @Post(':id/weights')
  @HttpCode(HttpStatus.CREATED)
  async addWeight(@Param('id') id: string, @Body() dto: CreateCatWeightDto) {
    return this.catsService.addWeight(id, dto);
  }

  @Delete(':id/weights/:weightId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWeight(@Param('id') id: string, @Param('weightId') weightId: string) {
    await this.catsService.removeWeight(id, weightId);
  }

  @Put(':id/primary-photo')
  @UseInterceptors(FileInterceptor('photo'))
  async updatePrimaryPhoto(
    @Param('id') id: string,
    @UploadedFile() photo?: PrimaryPhotoUpload,
  ) {
    return this.catsService.updatePrimaryPhoto(id, photo);
  }
}
