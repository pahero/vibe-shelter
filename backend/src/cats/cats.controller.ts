import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CatsService, PrimaryPhotoUpload } from './cats.service';
import { CreateCatHandler } from './commands/create-cat.handler';
import { CreateCatDto, CreateCatTagDto, CreateCatWeightDto, UpdateCatDto, UpdateCatTagDto } from './dto';

@Controller('api/cats')
@UseGuards(SessionAuthGuard)
export class CatsController {
  constructor(
    private catsService: CatsService,
    private createCatHandler: CreateCatHandler,
  ) {}

  @Get()
  async listCats(
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('tagId') tagId?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catsService.findAll({
      locationId,
      status,
      search,
      tagId,
      skip: skip === undefined ? undefined : Number(skip),
      limit: limit === undefined ? undefined : Number(limit),
    });
  }

  @Get('tags')
  async listTags() {
    return this.catsService.listTags();
  }

  @Get(':id/card')
  async getCatCard(@Param('id') id: string) {
    return this.catsService.findCardById(id);
  }

  @Get(':id/weights')
  async listWeights(@Param('id') id: string) {
    return this.catsService.listWeights(id);
  }

  @Get(':id/photos')
  async listPhotos(@Param('id') id: string) {
    return this.catsService.listPhotos(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCat(@Body() dto: CreateCatDto) {
    return this.createCatHandler.execute(dto.toCommand());
  }

  @Post('tags')
  @HttpCode(HttpStatus.CREATED)
  async createTag(@Body() dto: CreateCatTagDto) {
    return this.catsService.createTag(dto);
  }

  @Patch('tags/:tagId')
  async updateTag(@Param('tagId') tagId: string, @Body() dto: UpdateCatTagDto) {
    return this.catsService.updateTag(tagId, dto);
  }

  @Delete('tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTag(@Param('tagId') tagId: string) {
    await this.catsService.deleteTag(tagId);
  }

  @Patch(':id')
  async updateCat(@Param('id') id: string, @Body() dto: UpdateCatDto) {
    return this.catsService.updateCat(id, dto);
  }

  @Post(':id/tags/:tagId')
  async addTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.catsService.addTag(id, tagId);
  }

  @Delete(':id/tags/:tagId')
  async removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.catsService.removeTag(id, tagId);
  }

  @Post(':id/weights')
  @HttpCode(HttpStatus.CREATED)
  async addWeight(@Param('id') id: string, @Body() dto: CreateCatWeightDto) {
    return this.catsService.addWeight(id, dto);
  }

  @Post(':id/photos')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('photo'))
  async addPhoto(@Param('id') id: string, @UploadedFile() photo?: PrimaryPhotoUpload) {
    return this.catsService.addPhoto(id, photo);
  }

  @Put(':id/photos/:photoId/primary')
  async setPrimaryPhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    return this.catsService.setPrimaryPhoto(id, photoId);
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    return this.catsService.deletePhoto(id, photoId);
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
    @UploadedFile() photo: PrimaryPhotoUpload | undefined,
  ) {
    return this.catsService.updatePrimaryPhoto(id, photo);
  }
}
