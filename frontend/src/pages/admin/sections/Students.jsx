import { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeading,
} from "../../../components/ui";
import { SkeletonTable } from "../../../components/Skeleton";
import { UsersIcon } from "../../../components/icons";

const FILTERS = [
  { key: "all", label: "All Students" },
  { key: "ungrouped", label: "Without a Group" },
];

export default function Students() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // Search and the filter both run server-side so they cover the whole roster,
  // not just the page currently loaded. Trimmed so a stray space doesn't fetch
  // a new key.
  const query = search.trim();
  const params = new URLSearchParams();
  if (query) params.set("search", query);
  if (filter !== "all") params.set("filter", filter);
  const queryString = params.toString();

  const {
    data,
    error: swrError,
    mutate,
  } = useSWR(`/admin/students${queryString ? `?${queryString}` : ""}`);
  const students = data?.data ?? [];
  const isLoading = !data && !swrError;

  return (
    <div className="space-y-6">
      <PageHeading description="Every student account created from an imported roster. Tap a student to see their group, supervisor, and defense dates.">
        Students
      </PageHeading>

      <Card>
        <Input
          label="Search"
          placeholder="Search by name or index number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Students with no group are the ones an admin has to act on, and on
            a roster of hundreds they're invisible among the rest. */}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                filter === f.key
                  ? "bg-brand text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {swrError ? (
            <ErrorState
              title="Couldn't load students"
              description="The student roster didn't load. Check your connection and try again."
              onRetry={() => mutate()}
            />
          ) : isLoading ? (
            <SkeletonTable rows={6} cols={3} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title={
                query
                  ? "No students match that search"
                  : filter === "ungrouped"
                    ? "Every student is in a group"
                    : "No students yet"
              }
              description={
                query
                  ? "Try a different name or index number."
                  : filter === "ungrouped"
                    ? "Nobody is waiting to be placed."
                    : "Import a student roster and the accounts will appear here."
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {students.map((student) => {
                const project = student.projects?.[0];

                return (
                  <li key={student.id}>
                    <Link
                      to={`/admin/students/${student.id}`}
                      className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3.5 transition hover:bg-muted"
                    >
                      <Avatar
                        name={student.name}
                        className="mt-0.5 h-9 w-9 shrink-0 text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="font-semibold text-foreground">
                            {student.name}
                          </p>
                          {/* Until a student first signs in they still hold the
                            date-of-birth password the import generated, so
                            flagging that is the useful status here. */}
                          {student.is_first_login ? (
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                              Not signed in yet
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {student.university_id}
                        </p>
                        {student.student_email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {student.student_email}
                          </p>
                        )}
                        <div className="mt-1.5">
                          {project ? (
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-xs text-muted-foreground">
                                {project.title}
                              </span>
                              <Badge status={project.status} />
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not in a project group yet
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
