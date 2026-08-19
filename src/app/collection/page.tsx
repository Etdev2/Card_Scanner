import type { Metadata } from "next";
import { CollectionScreen } from "@/components/CollectionScreen";

export const metadata: Metadata = {
  title: "My collection — HoloScan",
  description:
    "Your personal card collection grid with live count and total estimated value.",
};

export default function CollectionPage() {
  return <CollectionScreen />;
}
