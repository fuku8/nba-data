export default function PlayoffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-4 -my-6 px-4 py-6 min-h-[calc(100vh-4rem)] bg-zinc-700">
      {children}
    </div>
  );
}
