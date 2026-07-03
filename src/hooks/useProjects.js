// hooks/useProjects.js — hook de domínio p/ projetos (reduz lógica nas páginas).
import { useLedLabContext, newProject } from "../store/AppContext.jsx";

export function useProjects() {
  const { projects, setProjects } = useLedLabContext();
  const createProject = (init) => {
    const p = newProject(init || { name: "Novo Projeto" });
    setProjects([...projects, p]);
    return p;
  };
  const removeProject = (id) => setProjects(projects.filter((p) => p.id !== id));
  const patchProject = (id, partial) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...partial, updatedAt: Date.now() } : p)));
  const getProject = (id) => projects.find((p) => p.id === id);
  return { projects, setProjects, createProject, removeProject, patchProject, getProject };
}
