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
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, SessionAuthGuard } from "../../auth";
import { CreateCatMedicalNoteHandler } from "./create-cat-medical-note.handler";
import { DeleteCatMedicalNoteHandler } from "./delete-cat-medical-note.handler";
import { ListCatMedicalNotesHandler } from "./list-cat-medical-notes.handler";
import { CreateMedicalNoteDto, UpdateMedicalNoteDto } from "./medical-note.dto";
import { UpdateCatMedicalNoteHandler } from "./update-cat-medical-note.handler";
type AuthenticatedUser = { id: string; isTest: boolean };
@Controller("api/cats")
@UseGuards(SessionAuthGuard)
export class CatMedicalNotesController {
  constructor(
    private readonly listNotes: ListCatMedicalNotesHandler,
    private readonly createNote: CreateCatMedicalNoteHandler,
    private readonly updateNote: UpdateCatMedicalNoteHandler,
    private readonly deleteNote: DeleteCatMedicalNoteHandler,
  ) {}
  @Get(":id/medical-notes") list(
    @Param("id") catId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listNotes.handle(catId, user.isTest);
  }
  @Post(":id/medical-notes") @HttpCode(HttpStatus.CREATED) create(
    @Param("id") catId: string,
    @Body() dto: CreateMedicalNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createNote.handle(catId, dto.toCommand(), user.id, user.isTest);
  }
  @Patch("medical-notes/:noteId") update(
    @Param("noteId") noteId: string,
    @Body() dto: UpdateMedicalNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateNote.handle(
      noteId,
      dto.toCommand(),
      user.id,
      user.isTest,
    );
  }
  @Delete("medical-notes/:noteId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("noteId") noteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteNote.handle(noteId, user.id, user.isTest);
  }
}
