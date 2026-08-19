import type { Metadata } from "next";
import { FeedScreen } from "@/components/FeedScreen";

export const metadata: Metadata = {
  title: "Feed — HoloScan",
  description: "Your saved cards, newest first. Stored on this device.",
};

export default function FeedPage() {
  return <FeedScreen />;
}
