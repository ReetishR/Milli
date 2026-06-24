import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SavedCompaniesPage() {
  async function deleteProfile(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await prisma.generatedProfile.delete({ where: { id } });
    revalidatePath("/companies/saved");
  }

  let profiles: Array<
    Awaited<
      ReturnType<
        typeof prisma.generatedProfile.findMany<{ include: { entity: true } }>
      >
    >[number]
  > = [];
  let queryError: string | null = null;

  try {
    profiles = await prisma.generatedProfile.findMany({
      where: { type: "company" },
      orderBy: { generated_at: "desc" },
      include: { entity: true },
      take: 200,
    });
  } catch (e) {
    queryError = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/companies" className="text-sm opacity-80 hover:opacity-100">
            Back
          </Link>
          <Link href="/" className="text-sm opacity-80 hover:opacity-100">
            Home
          </Link>
        </div>

        <h1 className="mt-6 text-3xl font-semibold">Saved company profiles</h1>
        <p className="mt-2 text-sm opacity-70">
          Showing the most recently generated profiles stored in the database. ({profiles.length})
        </p>

        {queryError && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {queryError}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {profiles.length === 0 && !queryError && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
              No saved profiles yet. Generate a few at /companies first.
            </div>
          )}

          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <Link
                href={`/companies/saved/${p.id}`}
                className="min-w-0 flex-1 hover:opacity-95"
              >
                <div className="text-xs opacity-60">
                  {new Date(p.generated_at).toLocaleString()} | v{p.version}
                </div>
                <div className="mt-1 text-lg font-semibold leading-snug">{p.title}</div>
                <div className="mt-1 text-sm opacity-80">{p.entity.name}</div>
              </Link>

              <form action={deleteProfile}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200 hover:bg-red-500/25"
                >
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
