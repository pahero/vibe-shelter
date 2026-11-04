export class CreateFlightCommand {
  constructor(
    readonly date: Date,
    readonly airport: string,
    readonly flightNumber: string | null,
    readonly flightParent: string | null,
    readonly actorUserId: string,
    readonly isTest: boolean,
    readonly comment: string | null = null,
  ) {}
}
