"use client";

import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formControlClassName } from "@/lib/formControlStyles";
import { formatLocalISODate } from "@/lib/sacramentProgram";
import {
  isBreadAssignmentFilled,
  telHref,
  type SacramentBreadAssignment,
  type SacramentBreadRideContact,
} from "@/lib/sacrament/breadAssignment";
import {
  assignmentDisplayName,
  formatSundayLabel,
  formatSundayMonthHeading,
  sundayWindow,
} from "@/lib/sunday/sundayAssignments";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FormState = {
  memberId: string | null;
  assignedTo: string;
  phone: string;
  reminderPreference: string;
  notes: string;
  confirmed: boolean;
};

type RideFormState = { name: string; phone: string };

function emptyForm(): FormState {
  return {
    memberId: null,
    assignedTo: "",
    phone: "",
    reminderPreference: "",
    notes: "",
    confirmed: false,
  };
}

function formFromAssignment(a: SacramentBreadAssignment): FormState {
  return {
    memberId: a.member_id,
    assignedTo: a.assigned_to ?? "",
    phone: a.phone ?? "",
    reminderPreference: a.reminder_preference ?? "",
    notes: a.notes ?? "",
    confirmed: a.confirmed,
  };
}

export function SacramentBreadClient({
  wardId,
  wardName,
  initialAssignments,
  members,
  initialRideContact,
}: {
  wardId: string;
  wardName: string;
  initialAssignments: SacramentBreadAssignment[];
  members: { id: string; name: string }[];
  initialRideContact: SacramentBreadRideContact | null;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editingSunday, setEditingSunday] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rideContact, setRideContact] = useState(initialRideContact);
  const [editingRide, setEditingRide] = useState(false);
  const [rideForm, setRideForm] = useState<RideFormState>(() => ({
    name: initialRideContact?.name ?? "",
    phone: initialRideContact?.phone ?? "",
  }));

  const todayIso = formatLocalISODate(new Date());
  const sundays = useMemo(() => sundayWindow(new Date()), []);

  const memberNameById = useMemo(
    () => new Map(members.map((m) => [m.id, m.name])),
    [members],
  );

  const byDate = useMemo(
    () => new Map(assignments.map((a) => [a.sunday_date, a])),
    [assignments],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of sundays) {
      const key = iso.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(iso);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [sundays]);

  const upcomingUnassigned = useMemo(
    () =>
      sundays.filter((iso) => iso >= todayIso && !isBreadAssignmentFilled(byDate.get(iso))).length,
    [sundays, todayIso, byDate],
  );

  function openEditor(sundayIso: string) {
    const existing = byDate.get(sundayIso);
    setEditingSunday(sundayIso);
    setForm(existing ? formFromAssignment(existing) : emptyForm());
    setFormError(null);
  }

  function closeEditor() {
    setEditingSunday(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!editingSunday) return;
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sacrament-bread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardId,
          sundayDate: editingSunday,
          memberId: form.memberId,
          assignedTo: form.assignedTo.trim() || null,
          phone: form.phone.trim() || null,
          reminderPreference: form.reminderPreference.trim() || null,
          notes: form.notes.trim() || null,
          confirmed: form.confirmed,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        assignment?: SacramentBreadAssignment | null;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to save");
      }

      const saved = json.assignment ?? null;
      setAssignments((prev) => {
        const rest = prev.filter((a) => a.sunday_date !== editingSunday);
        return saved
          ? [...rest, saved].sort((a, b) => a.sunday_date.localeCompare(b.sunday_date))
          : rest;
      });
      closeEditor();
      toast.success(saved ? "Assignment saved" : "Assignment cleared");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function openRideEditor() {
    setRideForm({ name: rideContact?.name ?? "", phone: rideContact?.phone ?? "" });
    setFormError(null);
    setEditingRide(true);
  }

  async function handleSaveRideContact() {
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sacrament-bread/ride-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardId,
          name: rideForm.name.trim() || null,
          phone: rideForm.phone.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        rideContact?: SacramentBreadRideContact | null;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to save");
      }

      setRideContact(json.rideContact ?? null);
      setEditingRide(false);
      toast.success("Ride contact saved");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sacrament Bread</h1>
        <p className="text-sm text-foreground/60">
          Who brings the bread each Sunday. Tap a Sunday to assign a member or a family.
        </p>
        <p className="text-xs text-foreground/45">{wardName}</p>
      </header>

      {upcomingUnassigned > 0 ? (
        <p className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground/70">
          {upcomingUnassigned} upcoming{" "}
          {upcomingUnassigned === 1 ? "Sunday still needs" : "Sundays still need"} someone assigned.
        </p>
      ) : null}

      <div className="space-y-8">
        {grouped.map(([monthKey, monthSundays]) => (
          <section key={monthKey} className="space-y-3">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-foreground/50">
              {formatSundayMonthHeading(`${monthKey}-01`)}
            </h2>
            <ul className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
              {monthSundays.map((iso) => {
                const assignment = byDate.get(iso);
                const name = assignment
                  ? assignmentDisplayName(
                      assignment.member_id,
                      assignment.assigned_to,
                      memberNameById,
                    )
                  : "";
                const isPast = iso < todayIso;

                return (
                  <li
                    key={iso}
                    className={cn(
                      "flex items-start justify-between gap-4 px-4 py-3.5",
                      isPast && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openEditor(iso)}
                      className="-m-1 min-w-0 flex-1 rounded-lg p-1 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {formatSundayLabel(iso)}
                      </span>
                      <span
                        className={cn(
                          "block text-sm",
                          name ? "text-foreground/80" : "text-foreground/35",
                        )}
                      >
                        {name || "Unassigned"}
                      </span>
                      {assignment?.notes ? (
                        <span className="block text-xs text-foreground/45">
                          {assignment.notes}
                        </span>
                      ) : null}
                    </button>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {assignment?.confirmed ? (
                        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Confirmed
                        </span>
                      ) : null}
                      {assignment?.phone ? (
                        <a
                          href={telHref(assignment.phone)}
                          className="text-sm text-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
                        >
                          {assignment.phone}
                        </a>
                      ) : null}
                      {assignment?.reminder_preference ? (
                        <span className="text-xs text-foreground/45">
                          Para recuerdo: {assignment.reminder_preference}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card px-4 py-3.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Si necesita un ride para llegar para preparar la Santa Cena
            </h2>
            {rideContact?.name || rideContact?.phone ? (
              <p className="mt-1 text-sm text-foreground/70">
                {rideContact.name}
                {rideContact.name && rideContact.phone ? " — " : ""}
                {rideContact.phone ? (
                  <a
                    href={telHref(rideContact.phone)}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {rideContact.phone}
                  </a>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 text-sm text-foreground/35">No contact set</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={openRideEditor}>
            Edit
          </Button>
        </div>
      </section>

      <Dialog open={editingSunday !== null} onOpenChange={(next) => { if (!next) closeEditor(); }}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sacrament bread</DialogTitle>
            <DialogDescription>
              {editingSunday ? formatSundayLabel(editingSunday) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="bread-member">Member</Label>
              <div className="mt-1">
                <MemberSearchSelect
                  id="bread-member"
                  lang="en"
                  members={members}
                  value={form.memberId}
                  onChange={(id) => setForm((f) => ({ ...f, memberId: id }))}
                  emptyLabel="Search member…"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bread-assigned-to">Or a family / group</Label>
              <Input
                id="bread-assigned-to"
                className={cn(formControlClassName, "mt-1")}
                value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                placeholder="e.g. Familia Rivera, Relief Society"
              />
            </div>

            <div>
              <Label htmlFor="bread-phone">Phone number</Label>
              <Input
                id="bread-phone"
                type="tel"
                inputMode="tel"
                className={cn(formControlClassName, "mt-1")}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="801-555-1234"
              />
            </div>

            <div>
              <Label htmlFor="bread-reminder">Para recuerdo</Label>
              <Input
                id="bread-reminder"
                className={cn(formControlClassName, "mt-1")}
                value={form.reminderPreference}
                onChange={(e) => setForm((f) => ({ ...f, reminderPreference: e.target.value }))}
                placeholder="e.g. Manda mensaje, texto, llamada"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.confirmed}
                onChange={(e) => setForm((f) => ({ ...f, confirmed: e.target.checked }))}
                className="size-4 rounded border-border accent-foreground"
              />
              <span>They confirmed</span>
            </label>

            <div>
              <Label htmlFor="bread-notes">Notes</Label>
              <Textarea
                id="bread-notes"
                className={cn(formControlClassName, "mt-1 min-h-[72px]")}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <p className="text-xs text-foreground/45">
              Clearing every field removes the assignment for this Sunday.
            </p>

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingRide} onOpenChange={(next) => { if (!next) setEditingRide(false); }}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ride contact</DialogTitle>
            <DialogDescription>
              Who to call for a ride to come prepare the sacrament.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="ride-name">Name</Label>
              <Input
                id="ride-name"
                className={cn(formControlClassName, "mt-1")}
                value={rideForm.name}
                onChange={(e) => setRideForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="ride-phone">Phone number</Label>
              <Input
                id="ride-phone"
                type="tel"
                inputMode="tel"
                className={cn(formControlClassName, "mt-1")}
                value={rideForm.phone}
                onChange={(e) => setRideForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="801-555-1234"
              />
            </div>

            <p className="text-xs text-foreground/45">
              Clearing both fields removes the ride contact.
            </p>

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRide(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveRideContact()} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
