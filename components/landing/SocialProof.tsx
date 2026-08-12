import { FadeIn } from "./animations/FadeIn";

export function SocialProof() {
  const stats = [
    { value: "2.500+", label: "Restaurantes ativos" },
    { value: "15M+", label: "Pedidos processados" },
    { value: "R$ 400M", label: "Em vendas gerenciadas" },
    { value: "4.9/5", label: "Avaliação nas lojas" },
  ];

  return (
    <section className="py-12 border-y border-border bg-white/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center divide-x divide-border">
          {stats.map((stat, i) => (
            <FadeIn key={i} delay={0.1 * i} className="flex flex-col items-center justify-center border-l-0 first:border-0 md:first:border-0 md:border-l">
              <span className="text-3xl md:text-4xl font-display font-black text-foreground mb-2">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
