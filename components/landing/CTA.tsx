import { FadeIn } from "./animations/FadeIn";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background with terracotta vibe */}
      <div className="absolute inset-0 bg-primary z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-orange-500/50 via-transparent to-transparent z-0" />
      <div className="grain-overlay opacity-10" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <FadeIn className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-display font-black text-primary-foreground mb-8 leading-tight">
            Chega de fechar o caixa <br className="hidden md:block"/>
            com dor de cabeça.
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
            Coloque a casa em ordem hoje mesmo. Teste o AgilizaFluxo grátis por 7 dias na sua operação. Sem compromisso, sem cartão exigido.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" variant="secondary" className="rounded-full px-10 h-16 text-lg font-bold text-primary hover:scale-105 transition-transform">
              Criar minha conta grátis
              <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
            <span className="text-primary-foreground/80 font-medium ml-4 hidden sm:block">
              Leva menos de 2 minutos
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
