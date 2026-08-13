import { FadeIn } from "./animations/FadeIn";
import { Flame, Clock, ShieldCheck } from "lucide-react";

export function VibeSection() {
  return (
    <section id="como-funciona" className="py-24 bg-foreground text-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-10 blur-[120px] bg-primary rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <FadeIn>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-black leading-tight mb-8">
              Nós sabemos como é <br />
              <span className="text-primary">a sexta-feira à noite.</span>
            </h2>
            <p className="text-xl text-background/80 leading-relaxed mb-8">
              Nos momentos mais movimentados, sua equipe precisa de clareza para atender bem, manter o ritmo e cuidar de cada cliente.
            </p>
            <p className="text-xl text-background/80 leading-relaxed">
              O AgilizaFluxo foi pensado para a rotina real dos restaurantes: simples de aprender, agradável de usar e pronto para apoiar sua equipe.
            </p>
          </FadeIn>
          
          <div className="space-y-6">
            <FadeIn delay={0.1}>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                <Flame className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Simples para sua equipe</h3>
                <p className="text-background/70">
                  Interface desenhada para dedos sujos de farinha e toques rápidos. Botões grandes, fluxos curtos, sem menus escondidos.
                </p>
              </div>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                <Clock className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Não precisa instalar nada</h3>
                <p className="text-background/70">
                  Você não tem uma semana para treinar sua equipe. Em 15 minutos, o caixa, o garçom e o chapeiro já entenderam como usar.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                <ShieldCheck className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Estoque mais organizado</h3>
                <p className="text-background/70">
                  Acompanhe entradas, perdas, contagens e níveis mínimos para tomar decisões de compra com mais segurança.
                </p>
              </div>
            </FadeIn>
          </div>
          
        </div>
      </div>
    </section>
  );
}
