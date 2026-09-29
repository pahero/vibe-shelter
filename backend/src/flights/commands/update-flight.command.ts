export class UpdateFlightCommand {
  constructor(
    readonly flightId: string,
    readonly date: Date | undefined,
    readonly airport: string | undefined,
    readonly flightNumber: string | undefined,
    readonly flightParent: string | undefined,
    readonly actorUserId: string,
    readonly isTest: boolean,
  ) {}
}
