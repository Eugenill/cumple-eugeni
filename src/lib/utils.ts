export function formatDataCatala(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data;
  const mesos = [
    "gener",
    "febrer",
    "març",
    "abril",
    "maig",
    "juny",
    "juliol",
    "agost",
    "setembre",
    "octubre",
    "novembre",
    "desembre",
  ];
  const dia = d.getUTCDate();
  const mes = mesos[d.getUTCMonth()];
  const any = d.getUTCFullYear();
  return `${dia} de ${mes} de ${any}`;
}

export function obtenirAny(data: string | Date): number {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.getUTCFullYear();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type MomentAmbRelacions = {
  id: string;
  titol: string;
  descripcio: string | null;
  data_moment: string;
  pujat_per: string | null;
  creat_el: string;
  persones: { id: string; nom: string }[];
  mitjans: { id: string; path: string; tipus: "imatge" }[];
};
