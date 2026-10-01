import { SetMetadata } from "@nestjs/common";

const IS_PUBLIC_ROUTE = "shelter:public-route";

export function Public() {
  return SetMetadata(IS_PUBLIC_ROUTE, true);
}
