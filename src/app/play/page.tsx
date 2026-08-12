import { redirect } from "next/navigation";
import { DEFAULT_GAME } from "@/lib/games/meta";

export default function PlayIndex() {
  redirect(`/problems/${DEFAULT_GAME}/versus`);
}
