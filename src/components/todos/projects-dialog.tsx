"use client";

import { useState, type FormEvent } from "react";

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
import { createProject, ProjectApiError } from "@/lib/projects/client";
import type { ProjectDto } from "@/lib/projects/contracts";

type ProjectsDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly projects: readonly ProjectDto[];
  readonly onProjectCreated: (project: ProjectDto) => void;
};

function errorMessage(error: unknown): string {
  if (error instanceof ProjectApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "The Project request failed. Please try again.";
}

export function ProjectsDialog({
  open,
  onOpenChange,
  projects,
  onProjectCreated,
}: ProjectsDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = projectName.trim();
    const trimmedPath = projectPath.trim();
    if (!trimmedName || !trimmedPath) return;

    setSaving(true);
    setError(null);
    try {
      const project = await createProject({
        projectName: trimmedName,
        projectPath: trimmedPath,
      });
      onProjectCreated(project);
      setProjectName("");
      setProjectPath("");
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  const canSave = projectName.trim().length > 0 && projectPath.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
          <DialogDescription>
            Create projects to associate with Todo work.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-40 space-y-2 overflow-y-auto">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div key={project.id} className="min-w-0 rounded-lg border px-3 py-2">
                <p className="truncate text-sm font-medium">{project.projectName}</p>
                <p className="truncate text-xs text-muted-foreground" title={project.projectPath}>
                  {project.projectPath}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          )}
        </div>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Project name</span>
            <Input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Dayflow"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Project path</span>
            <Input
              value={projectPath}
              onChange={(event) => setProjectPath(event.target.value)}
              placeholder="/workspace/dayflow"
              autoComplete="off"
            />
          </label>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={saving || !canSave}>
              {saving ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
