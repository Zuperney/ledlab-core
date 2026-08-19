// hooks/useProjects.js — hook de domínio p/ projetos (reduz lógica nas páginas).
import { useLedLabContext, newProject } from "../store/AppContext.jsx";
import { apagarImagem } from "../services/estrutura/imagem.js";
import { esquecerHistorico } from "../services/estrutura/sessao.js";

export function useProjects() {
  const { projects, setProjects, prefs } = useLedLabContext();
  const createProject = (init) => {
    const base = init || { name: "Novo projeto" };
    // projeto novo herda a tensão/defaults elétricos das preferências globais (Configurações)
    const config = base.config || { vk: prefs.vk || "220_tri", brilho: prefs.brilho ?? 0.7, conteudo: prefs.conteudo ?? 0.33 };
    const p = newProject({ ...base, config });
    setProjects([...projects, p]);
    return p;
  };
  const removeProject = (id) => {
    // A vista 3D do projeto mora no IndexedDB, fora do projeto (ver
    // estrutura/imagem.js) — sumir com o projeto e deixar o PNG lá enche o
    // aparelho de imagem de projeto que não existe mais. Mesma faxina que o
    // Reembolso faz com `delFoto`.
    apagarImagem(id);
    esquecerHistorico(id);
    setProjects(projects.filter((p) => p.id !== id));
  };
  const patchProject = (id, partial) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...partial, updatedAt: Date.now() } : p)));
  const getProject = (id) => projects.find((p) => p.id === id);
  return { projects, setProjects, createProject, removeProject, patchProject, getProject };
}
