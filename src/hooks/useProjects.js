// hooks/useProjects.js — hook de domínio p/ projetos (reduz lógica nas páginas).
import { useLedLabContext, newProject } from "../store/AppContext.jsx";

export function useProjects() {
  const { projects, setProjects, prefs } = useLedLabContext();
  const createProject = (init) => {
    const base = init || { name: "Novo Projeto" };
    // projeto novo herda a tensão/defaults elétricos das preferências globais (Configurações)
    const config = base.config || { vk: prefs.vk || "220_tri", brilho: prefs.brilho ?? 0.7, conteudo: prefs.conteudo ?? 0.33 };
    const p = newProject({ ...base, config });
    setProjects([...projects, p]);
    return p;
  };
  const removeProject = (id) => setProjects(projects.filter((p) => p.id !== id));
  const patchProject = (id, partial) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...partial, updatedAt: Date.now() } : p)));
  const getProject = (id) => projects.find((p) => p.id === id);
  return { projects, setProjects, createProject, removeProject, patchProject, getProject };
}
