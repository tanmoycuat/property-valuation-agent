import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { api, type Skill, type SkillDraft } from "../lib/api";
import { Button, Card, Field, Notice, SectionLabel, Skeleton, inputClass } from "../components/ui";

const EMPTY_DRAFT: SkillDraft = {
  name: "",
  description: "",
  instruction: "",
  enabled: true,
  category: "Valuation",
};

export default function AgentSkills() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SkillDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const skills = useQuery({
    queryKey: ["/api/skills"],
    queryFn: api.listSkills,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/skills"] });

  const save = useMutation({
    mutationFn: () =>
      editingId ? api.updateSkill(editingId, draft) : api.createSkill(draft),
    onSuccess: async () => {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      setFormError(null);
      await refresh();
    },
    onError: () => setFormError("The skill could not be saved. Check the fields and try again."),
  });

  const remove = useMutation({
    mutationFn: api.deleteSkill,
    onSuccess: refresh,
  });

  function edit(skill: Skill) {
    setEditingId(skill.id);
    setDraft({
      name: skill.name,
      description: skill.description,
      instruction: skill.instruction,
      enabled: skill.enabled,
      category: skill.category,
    });
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  }

  function updateDraft<K extends keyof SkillDraft>(key: K, value: SkillDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const grouped = (skills.data ?? []).reduce<Record<string, Skill[]>>((groups, skill) => {
    (groups[skill.category] ??= []).push(skill);
    return groups;
  }, {});

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Agent skills / 02
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Tune the assistant&apos;s judgment.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Skills are operating instructions that shape every assistant response. Keep them specific,
          testable, and aligned with how your team works.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex flex-col gap-6">
          {skills.isLoading ? (
            <Card>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-5 h-20 w-full" />
              <Skeleton className="mt-3 h-20 w-full" />
            </Card>
          ) : null}

          {skills.isError ? (
            <Notice tone="error">The skills could not be loaded. Refresh and try again.</Notice>
          ) : null}

          {Object.entries(grouped).map(([category, categorySkills]) => (
            <Card key={category}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {category}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Active instructions</h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {categorySkills.filter((skill) => skill.enabled).length} active
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {categorySkills.map((skill) => (
                  <article key={skill.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{skill.name}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              skill.enabled
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {skill.enabled ? "Enabled" : "Paused"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{skill.description}</p>
                        <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm leading-6 text-foreground/80">
                          {skill.instruction}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="ghost"
                          aria-label={`Edit ${skill.name}`}
                          onClick={() => edit(skill)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`${skill.enabled ? "Pause" : "Enable"} ${skill.name}`}
                          onClick={() =>
                            api.updateSkill(skill.id, { enabled: !skill.enabled }).then(refresh)
                          }
                        >
                          {skill.enabled ? "Pause" : "Enable"}
                        </Button>
                        <button
                          type="button"
                          className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent/15 hover:text-accent-foreground"
                          aria-label={`Delete ${skill.name}`}
                          onClick={() => remove.mutate(skill.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <Card className="h-fit">
          <SectionLabel step={editingId ? "Edit skill" : "New skill"} title="Add an instruction" />
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.name.trim() || !draft.instruction.trim()) {
                setFormError("Name and instruction are required.");
                return;
              }
              save.mutate();
            }}
          >
            <Field label="Name">
              <input
                className={inputClass}
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="Comparable sales check"
              />
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={draft.category}
                onChange={(event) => updateDraft("category", event.target.value)}
              >
                <option>Valuation</option>
                <option>Trust</option>
                <option>Communication</option>
              </select>
            </Field>
            <Field label="Description">
              <input
                className={inputClass}
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                placeholder="What this skill contributes"
              />
            </Field>
            <Field label="Instruction">
              <textarea
                className={`${inputClass} min-h-[130px] resize-y`}
                value={draft.instruction}
                onChange={(event) => updateDraft("instruction", event.target.value)}
                placeholder="State exactly how the assistant should reason..."
              />
            </Field>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => updateDraft("enabled", event.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Enable this skill immediately
            </label>

            {formError ? <Notice tone="error">{formError}</Notice> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {save.isPending ? "Saving..." : editingId ? "Save changes" : "Add skill"}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
