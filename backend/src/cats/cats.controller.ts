import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser, SessionAuthGuard } from "../auth";
import { PrimaryPhotoUpload } from "./cats.types";
import { ListCatsHandler } from "./queries/list-cats.handler";
import { ListCatTagsHandler } from "./queries/list-cat-tags.handler";
import { GetCatCardHandler } from "./queries/get-cat-card.handler";
import { ListCatWeightsHandler } from "./queries/list-cat-weights.handler";
import { ListCatPhotosHandler } from "./queries/list-cat-photos.handler";
import { ListCatDocumentsHandler } from "./queries/list-cat-documents.handler";
import { UpdateCatHandler } from "./commands/update-cat.handler";
import { UpdateCatNameNumberHandler } from "./commands/update-cat-name-number.handler";
import { CreateCatTagHandler } from "./commands/create-cat-tag.handler";
import { UpdateCatTagHandler } from "./commands/update-cat-tag.handler";
import { DeleteCatTagHandler } from "./commands/delete-cat-tag.handler";
import { AddCatTagHandler } from "./commands/add-cat-tag.handler";
import { RemoveCatTagHandler } from "./commands/remove-cat-tag.handler";
import { AddCatWeightHandler } from "./commands/add-cat-weight.handler";
import { DeleteCatWeightHandler } from "./commands/delete-cat-weight.handler";
import { AddCatPhotoHandler } from "./commands/add-cat-photo.handler";
import { UpdatePrimaryCatPhotoHandler } from "./commands/update-primary-cat-photo.handler";
import { SetPrimaryCatPhotoHandler } from "./commands/set-primary-cat-photo.handler";
import { DeleteCatPhotoHandler } from "./commands/delete-cat-photo.handler";
import { AddCatDocumentHandler } from "./commands/add-cat-document.handler";
import { DeleteCatDocumentHandler } from "./commands/delete-cat-document.handler";
import { CreateCatHandler } from "./commands/create-cat.handler";
import { ArchiveCatHandler } from "./commands/archive-cat.handler";
import { DearchiveCatHandler } from "./commands/dearchive-cat.handler";
import {
  ArchiveCatDto,
  CreateCatDto,
  CreateCatTagDto,
  CreateCatWeightDto,
  UpdateCatDto,
  UpdateCatTagDto,
} from "./dto";
import { ListCatHistoryQuery } from "./queries/list-cat-history.query";
import { ListAllCatHistoryQuery } from "./queries/list-all-cat-history.query";
import { ListFlightCandidatesHandler } from "./queries/list-flight-candidates.handler";
import { ListCatsQueryDto } from "./dto/list-cats-query.dto";
import { UpdateCatNameNumberDto } from "./dto/update-cat-name-number.dto";

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller("api/cats")
@UseGuards(SessionAuthGuard)
export class CatsController {
  constructor(
    private readonly listCatsHandler: ListCatsHandler,
    private readonly listCatTagsHandler: ListCatTagsHandler,
    private readonly getCatCardHandler: GetCatCardHandler,
    private readonly listCatWeightsHandler: ListCatWeightsHandler,
    private readonly listCatPhotosHandler: ListCatPhotosHandler,
    private readonly listCatDocumentsHandler: ListCatDocumentsHandler,
    private readonly updateCatHandler: UpdateCatHandler,
    private readonly updateCatNameNumberHandler: UpdateCatNameNumberHandler,
    private readonly createCatTagHandler: CreateCatTagHandler,
    private readonly updateCatTagHandler: UpdateCatTagHandler,
    private readonly deleteCatTagHandler: DeleteCatTagHandler,
    private readonly addCatTagHandler: AddCatTagHandler,
    private readonly removeCatTagHandler: RemoveCatTagHandler,
    private readonly addCatWeightHandler: AddCatWeightHandler,
    private readonly deleteCatWeightHandler: DeleteCatWeightHandler,
    private readonly addCatPhotoHandler: AddCatPhotoHandler,
    private readonly updatePrimaryCatPhotoHandler: UpdatePrimaryCatPhotoHandler,
    private readonly setPrimaryCatPhotoHandler: SetPrimaryCatPhotoHandler,
    private readonly deleteCatPhotoHandler: DeleteCatPhotoHandler,
    private readonly addCatDocumentHandler: AddCatDocumentHandler,
    private readonly deleteCatDocumentHandler: DeleteCatDocumentHandler,
    private readonly createCatHandler: CreateCatHandler,
    private readonly archiveCatHandler: ArchiveCatHandler,
    private readonly dearchiveCatHandler: DearchiveCatHandler,
    private readonly listCatHistoryQuery: ListCatHistoryQuery,
    private readonly listAllCatHistoryQuery: ListAllCatHistoryQuery,
    private readonly listFlightCandidatesHandler: ListFlightCandidatesHandler,
  ) {}

  @Get()
  async listCats(
    @Query("locationId") locationId?: string,
    @Query("search") search?: string,
    @Query("tagId") tagId?: string,
    @Query("archived") archived?: string,
    @Query("skip") skip?: string,
    @Query("limit") limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.listCatsHandler.handle(
      ListCatsQueryDto.toQuery({
        locationId,
        search,
        tagId,
        archived,
        skip,
        limit,
      }),
      user?.isTest ?? false,
    );
  }

  @Get("tags")
  async listTags(@CurrentUser() user: AuthenticatedUser) {
    return this.listCatTagsHandler.handle(user.isTest);
  }

  @Get("flight-candidates")
  async listFlightCandidates(@CurrentUser() user: AuthenticatedUser) {
    return this.listFlightCandidatesHandler.handle(user.isTest);
  }

  @Get("history")
  async listAllHistory(
    @Query("user") user?: string,
    @Query("catId") catId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("skip") skip?: string,
    @Query("limit") limit?: string,
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

  @Get(":id/card")
  async getCatCard(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getCatCardHandler.handle(id, user.isTest);
  }

  @Get(":id/weights")
  async listWeights(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listCatWeightsHandler.handle(id, user.isTest);
  }

  @Get(":id/photos")
  async listPhotos(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listCatPhotosHandler.handle(id, user.isTest);
  }

  @Get(":id/documents")
  async listDocuments(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listCatDocumentsHandler.handle(id, user.isTest);
  }

  @Get(":id/history")
  async listHistory(
    @Param("id") id: string,
    @Query("skip") skip?: string,
    @Query("limit") limit?: string,
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
  async createCat(
    @Body() dto: CreateCatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createCatHandler.execute(dto.toCommand(user.id, user.isTest));
  }

  @Post(":id/archive")
  async archiveCat(
    @Param("id") id: string,
    @Body() dto: ArchiveCatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.archiveCatHandler.execute({
      catId: id,
      reasonId: dto.reasonId,
      actorUserId: user.id,
      currentUserIsTest: user.isTest,
    });
  }

  @Post(":id/dearchive")
  async dearchiveCat(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dearchiveCatHandler.execute({
      catId: id,
      actorUserId: user.id,
      currentUserIsTest: user.isTest,
    });
  }

  @Post("tags")
  @HttpCode(HttpStatus.CREATED)
  async createTag(
    @Body() dto: CreateCatTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createCatTagHandler.handle(dto.toCommand(), user.id, user.isTest);
  }

  @Patch("tags/:tagId")
  async updateTag(
    @Param("tagId") tagId: string,
    @Body() dto: UpdateCatTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateCatTagHandler.handle(tagId, dto.toCommand(), user.id, user.isTest);
  }

  @Delete("tags/:tagId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTag(
    @Param("tagId") tagId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteCatTagHandler.handle(tagId, user.id, user.isTest);
  }

  @Patch(":id")
  async updateCat(
    @Param("id") id: string,
    @Body() dto: UpdateCatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateCatHandler.handle(
      id,
      dto.toCommand(),
      user.id,
      user.isTest,
    );
  }

  @Patch(":id/name-number")
  async updateCatNameNumber(
    @Param("id") id: string,
    @Body() dto: UpdateCatNameNumberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateCatNameNumberHandler.handle(
      id,
      dto.toCommand().nameNumber,
      user.isTest,
      user.id,
    );
  }

  @Post(":id/tags/:tagId")
  async addTag(
    @Param("id") id: string,
    @Param("tagId") tagId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addCatTagHandler.handle(id, tagId, user.id, user.isTest);
  }

  @Delete(":id/tags/:tagId")
  async removeTag(
    @Param("id") id: string,
    @Param("tagId") tagId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.removeCatTagHandler.handle(id, tagId, user.id, user.isTest);
  }

  @Post(":id/weights")
  @HttpCode(HttpStatus.CREATED)
  async addWeight(
    @Param("id") id: string,
    @Body() dto: CreateCatWeightDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addCatWeightHandler.handle(
      id,
      dto.toCommand(),
      user.id,
      user.isTest,
    );
  }

  @Post(":id/photos")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("photo"))
  async addPhoto(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() photo?: PrimaryPhotoUpload,
  ) {
    return this.addCatPhotoHandler.handle(id, photo, user.id, user.isTest);
  }

  @Post(":id/documents")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor("document", { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async addDocument(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() document?: PrimaryPhotoUpload,
  ) {
    return this.addCatDocumentHandler.handle(
      id,
      document,
      user.id,
      user.isTest,
    );
  }

  @Put(":id/photos/:photoId/primary")
  async setPrimaryPhoto(
    @Param("id") id: string,
    @Param("photoId") photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.setPrimaryCatPhotoHandler.handle(id, photoId, user.isTest);
  }

  @Delete(":id/photos/:photoId")
  async deletePhoto(
    @Param("id") id: string,
    @Param("photoId") photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deleteCatPhotoHandler.handle(id, photoId, user.id, user.isTest);
  }

  @Delete(":id/documents/:documentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteCatDocumentHandler.handle(
      id,
      documentId,
      user.id,
      user.isTest,
    );
  }

  @Delete(":id/weights/:weightId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWeight(
    @Param("id") id: string,
    @Param("weightId") weightId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteCatWeightHandler.handle(
      id,
      weightId,
      user.id,
      user.isTest,
    );
  }

  @Put(":id/primary-photo")
  @UseInterceptors(FileInterceptor("photo"))
  async updatePrimaryPhoto(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() photo: PrimaryPhotoUpload | undefined,
  ) {
    return this.updatePrimaryCatPhotoHandler.handle(
      id,
      photo,
      user.id,
      user.isTest,
    );
  }
}
