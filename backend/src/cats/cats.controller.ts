import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CatsService, PrimaryPhotoUpload } from './cats.service';
import { CreateCatHandler } from './commands/create-cat.handler';
import { ArchiveCatHandler } from './commands/archive-cat.handler';
import { DearchiveCatHandler } from './commands/dearchive-cat.handler';
import { ArchiveCatDto, CreateCatDto, CreateCatTagDto, CreateCatWeightDto, UpdateCatDto, UpdateCatTagDto } from './dto';
import { ListCatHistoryQuery } from './queries/list-cat-history.query';
import { ListAllCatHistoryQuery } from './queries/list-all-cat-history.query';

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller('api/cats')
@UseGuards(SessionAuthGuard)
export class CatsController {
  constructor(
    private catsService: CatsService,
    private createCatHandler: CreateCatHandler,
    private archiveCatHandler: ArchiveCatHandler,
    private dearchiveCatHandler: DearchiveCatHandler,
    private listCatHistoryQuery: ListCatHistoryQuery,
    private listAllCatHistoryQuery: ListAllCatHistoryQuery,
  ) {}

  @Get()
  async listCats(
    @Query('locationId') locationId?: string,
    @Query('search') search?: string,
    @Query('tagId') tagId?: string,
    @Query('archived') archived?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.catsService.findAll({
      locationId,
      search,
      tagId,
      archived: archived === 'true',
      skip: skip === undefined ? undefined : Number(skip),
      limit: limit === undefined ? undefined : Number(limit),
    }, user?.isTest ?? false);
  }

  @Get('tags')
  async listTags() {
    return this.catsService.listTags();
  }

  @Get('history')
  @ApiOperation({ summary: 'List all cat audit history with filters' })
  @ApiQuery({ name: 'user', required: false })
  @ApiQuery({ name: 'catId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'All cat history entries, newest first' })
  async listAllHistory(
    @Query('user') user?: string,
    @Query('catId') catId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ) {
    return this.listAllCatHistoryQuery.execute({
      user,
      catId,
      from,
      to,
      skip: skip === undefined ? undefined : Number(skip),
      limit: limit === undefined ? undefined : Number(limit),
      currentUserIsTest: currentUser?.isTest ?? false,
    });
  }

  @Get(':id/card')
  async getCatCard(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.findCardById(id, user.isTest);
  }

  @Get(':id/weights')
  async listWeights(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.listWeights(id, user.isTest);
  }

  @Get(':id/photos')
  async listPhotos(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.listPhotos(id, user.isTest);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'List cat audit history' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Cat history entries, newest first' })
  async listHistory(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.listCatHistoryQuery.execute({
      catId: id,
      skip: skip === undefined ? undefined : Number(skip),
      limit: limit === undefined ? undefined : Number(limit),
      currentUserIsTest: user?.isTest ?? false,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCat(@Body() dto: CreateCatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.createCatHandler.execute(dto.toCommand(user.id, user.isTest));
  }

  @Post(':id/archive')
  async archiveCat(@Param('id') id: string, @Body() dto: ArchiveCatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.archiveCatHandler.execute({ catId: id, reasonId: dto.reasonId, actorUserId: user.id, currentUserIsTest: user.isTest });
  }

  @Post(':id/dearchive')
  async dearchiveCat(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dearchiveCatHandler.execute({ catId: id, actorUserId: user.id, currentUserIsTest: user.isTest });
  }

  @Post('tags')
  @HttpCode(HttpStatus.CREATED)
  async createTag(@Body() dto: CreateCatTagDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.createTag(dto, user.id);
  }

  @Patch('tags/:tagId')
  async updateTag(@Param('tagId') tagId: string, @Body() dto: UpdateCatTagDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.updateTag(tagId, dto, user.id);
  }

  @Delete('tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTag(@Param('tagId') tagId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.catsService.deleteTag(tagId, user.id);
  }

  @Patch(':id')
  async updateCat(@Param('id') id: string, @Body() dto: UpdateCatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.updateCat(id, dto, user.id, user.isTest);
  }

  @Post(':id/tags/:tagId')
  async addTag(@Param('id') id: string, @Param('tagId') tagId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.addTag(id, tagId, user.id, user.isTest);
  }

  @Delete(':id/tags/:tagId')
  async removeTag(@Param('id') id: string, @Param('tagId') tagId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.removeTag(id, tagId, user.id, user.isTest);
  }

  @Post(':id/weights')
  @HttpCode(HttpStatus.CREATED)
  async addWeight(@Param('id') id: string, @Body() dto: CreateCatWeightDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.addWeight(id, dto, user.id, user.isTest);
  }

  @Post(':id/photos')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('photo'))
  async addPhoto(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @UploadedFile() photo?: PrimaryPhotoUpload) {
    return this.catsService.addPhoto(id, photo, user.id, user.isTest);
  }

  @Put(':id/photos/:photoId/primary')
  async setPrimaryPhoto(@Param('id') id: string, @Param('photoId') photoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.setPrimaryPhoto(id, photoId, user.isTest);
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(@Param('id') id: string, @Param('photoId') photoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catsService.deletePhoto(id, photoId, user.id, user.isTest);
  }

  @Delete(':id/weights/:weightId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWeight(@Param('id') id: string, @Param('weightId') weightId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.catsService.removeWeight(id, weightId, user.id, user.isTest);
  }

  @Put(':id/primary-photo')
  @UseInterceptors(FileInterceptor('photo'))
  async updatePrimaryPhoto(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() photo: PrimaryPhotoUpload | undefined,
  ) {
    return this.catsService.updatePrimaryPhoto(id, photo, user.id, user.isTest);
  }
}
