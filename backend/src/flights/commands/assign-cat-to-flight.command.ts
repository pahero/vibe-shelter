export class AssignCatToFlightCommand {
  constructor(
    readonly flightId: string,
    readonly catId: string,
    readonly actorUserId: string,
    readonly isTest: boolean,
  ) {}
}
