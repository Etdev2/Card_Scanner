import type { Metadata } from "next";
import { PostDetailScreen } from "@/components/PostDetailScreen";

export const metadata: Metadata = {
  title: "Card — HoloScan",
};

export default async function CollectionPostPage(
  props: PageProps<"/collection/[id]">,
) {
  const { id } = await props.params;
  return <PostDetailScreen id={id} />;
}
