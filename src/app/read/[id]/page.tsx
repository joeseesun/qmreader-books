import ReaderApp from "@/components/reader-app";

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReaderApp bookId={id} />;
}
