import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "BP Glass" },
    { name: "description", content: "Maquinaria, mantenciones, inventario y órdenes de trabajo." },
    { property: "og:title", content: "BP Glass" },
    { property: "og:description", content: "Gestión de maquinaria industrial y mantenimiento." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/panel" });
  },
  component: () => null,
});
