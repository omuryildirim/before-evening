import type { MetaFunction } from "@remix-run/cloudflare";
import CarGame from '~/components/car-game';

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <CarGame />
  )
};
