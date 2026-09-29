export class CreateFlightCommand {
  constructor(
    readonly date: Date,
    readonly airport: string,
    readonly flightNumber: string,
    readonly flightParent: string,
    readonly actorUserId: string,
    readonly isTest: boolean,
  ) {}
}
