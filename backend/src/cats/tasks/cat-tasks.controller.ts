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
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../auth/guards/session-auth.guard";
import { CompleteCatTaskHandler } from "./complete-cat-task.handler";
import { CreateCatTaskHandler } from "./create-cat-task.handler";
import { DeleteCatTaskHandler } from "./delete-cat-task.handler";
import { ListCatTasksHandler } from "./list-cat-tasks.handler";
import { TaskDto, UpdateTaskDto } from "./task.dto";
import { UpdateCatTaskHandler } from "./update-cat-task.handler";

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller("api/cats")
@UseGuards(SessionAuthGuard)
export class CatTasksController {
  constructor(
    private readonly listCatTasksHandler: ListCatTasksHandler,
    private readonly createCatTaskHandler: CreateCatTaskHandler,
    private readonly updateCatTaskHandler: UpdateCatTaskHandler,
    private readonly deleteCatTaskHandler: DeleteCatTaskHandler,
    private readonly completeCatTaskHandler: CompleteCatTaskHandler,
  ) {}

  @Get(":id/tasks")
  async listTasks(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listCatTasksHandler.handle(id, user.isTest);
  }

  @Post(":id/tasks")
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Param("id") id: string,
    @Body() dto: TaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createCatTaskHandler.handle(id, dto.toPayload(), user.id, user.isTest);
  }

  @Patch("tasks/:taskId")
  async updateTask(
    @Param("taskId") taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateCatTaskHandler.handle(taskId, dto.toPayload(), user.id, user.isTest);
  }

  @Delete("tasks/:taskId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(@Param("taskId") taskId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteCatTaskHandler.handle(taskId, user.id, user.isTest);
  }

  @Post("tasks/:taskId/complete")
  async completeTask(@Param("taskId") taskId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.completeCatTaskHandler.handle(taskId, user.id, user.isTest);
  }
}
