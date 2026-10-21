import { redirect } from "next/navigation";

export const metadata = {
  title: "Flight candidates | Shelter",
};

export default async function FlightCandidatesPage() {
  redirect("/flights");
}
