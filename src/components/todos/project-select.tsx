"use client";

import { useId, useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectDto } from "@/lib/projects/contracts";

const NO_PROJECT_VALUE = "__no_project__";

type ProjectSelectProps = {
  readonly projects: readonly ProjectDto[];
  readonly value: string | null;
  readonly onValueChange: (projectId: string | null) => void;
  readonly disabled?: boolean;
};

export function ProjectSelect({
  projects,
  value,
  onValueChange,
  disabled = false,
}: ProjectSelectProps) {
  const id = useId();
  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => left.projectName.localeCompare(right.projectName)),
    [projects],
  );

  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium">Project</span>
      <Select
        value={value ?? NO_PROJECT_VALUE}
        disabled={disabled}
        onValueChange={(nextValue) =>
          onValueChange(nextValue === NO_PROJECT_VALUE ? null : nextValue)
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
          {sortedProjects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">{project.projectName}</span>
                <span
                  className="truncate text-xs text-muted-foreground"
                  title={project.projectPath}
                >
                  {project.projectPath}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
