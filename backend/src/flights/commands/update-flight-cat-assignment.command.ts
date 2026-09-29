export class UpdateFlightCatAssignmentCommand {
  constructor(
    readonly assignmentId: string,
    readonly f2fDone: boolean | undefined,
    readonly tracesDone: boolean | undefined,
    readonly actorUserId: string,
    readonly isTest: boolean,
  ) {}
}
