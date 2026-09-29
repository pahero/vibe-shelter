import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../auth/guards/session-auth.guard";
import { CreateCatNoteHandler } from "./create-cat-note.handler";
import { DeleteCatNoteHandler } from "./delete-cat-note.handler";
import { ListCatNotesHandler } from "./list-cat-notes.handler";
import { CreateNoteDto, UpdateNoteDto } from "./note.dto";
import { UpdateCatNoteHandler } from "./update-cat-note.handler";
type AuthenticatedUser = { id: string; isTest: boolean };
@Controller("api/cats") @UseGuards(SessionAuthGuard)
export class CatNotesController { constructor(private readonly listNotes: ListCatNotesHandler, private readonly createNote: CreateCatNoteHandler, private readonly updateNote: UpdateCatNoteHandler, private readonly deleteNote: DeleteCatNoteHandler) {} @Get(":id/notes") list(@Param("id") catId: string, @CurrentUser() user: AuthenticatedUser) { return this.listNotes.handle(catId, user.isTest); } @Post(":id/notes") @HttpCode(HttpStatus.CREATED) create(@Param("id") catId: string, @Body() dto: CreateNoteDto, @CurrentUser() user: AuthenticatedUser) { return this.createNote.handle(catId, dto.toCommand(), user.id, user.isTest); } @Patch("notes/:noteId") update(@Param("noteId") noteId: string, @Body() dto: UpdateNoteDto, @CurrentUser() user: AuthenticatedUser) { return this.updateNote.handle(noteId, dto.toCommand(), user.id, user.isTest); } @Delete("notes/:noteId") @HttpCode(HttpStatus.NO_CONTENT) async remove(@Param("noteId") noteId: string, @CurrentUser() user: AuthenticatedUser) { await this.deleteNote.handle(noteId, user.id, user.isTest); } }
