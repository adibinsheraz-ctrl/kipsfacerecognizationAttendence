"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, EmptyState, Input, Skeleton } from "@/components/ui/primitives";

type Person = {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  className: string;
  role: string;
  thumbnail: string | null;
  active: boolean;
};

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [q, setQ] = useState("");

  async function load(query = q) {
    const res = await fetch(`/api/people?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setPeople(data.people || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleActive(person: Person) {
    await fetch(`/api/people/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !person.active }),
    });
    load();
  }

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            People
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Enroll faces, edit profiles, deactivate access
          </p>
        </div>
        <Link href="/admin/people/new">
          <Button>Enroll person</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search name, roll, class…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="max-w-sm"
        />
        <Button variant="secondary" onClick={() => load()}>
          Search
        </Button>
      </div>

      {!people ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : people.length === 0 ? (
        <Card>
          <EmptyState
            title="No one enrolled yet"
            description="Add a student or staff member and capture 3 to 5 face angles for reliable matching."
            action={
              <Link href="/admin/people/new">
                <Button>Enroll first person</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50 text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Roll</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                            {p.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-[var(--muted)]">{p.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{p.rollNumber}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{p.className}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.active
                            ? "text-[var(--success)]"
                            : "text-[var(--muted)]"
                        }
                      >
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/people/${p.id}`}>
                          <Button size="sm" variant="secondary">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(p)}
                        >
                          {p.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
