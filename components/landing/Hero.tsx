import { Button } from "@/components/ui/button";
import { FadeIn } from "./animations/FadeIn";
import { ArrowRight, Play, CheckCircle2, Flame } from "lucide-react";
const heroImage = "/landing/hero-kitchen.jpg";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-background">
      {/* Decorative grain and blur */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="grain-overlay" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <div className="max-w-2xl">
            <FadeIn delay={0.1}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Feito para restaurantes de verdade
              </div>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black leading-[1.05] tracking-tight mb-6 text-foreground">
                O controle do salão, da cozinha e do <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">caixa nas suas mãos.</span>
              </h1>
            </FadeIn>
            
            <FadeIn delay={0.3}>
              <p className="text-base md:text-lg italic text-primary/80 font-medium mb-4 max-w-xl">
                A transparência que sua cozinha precisa, o controle que você merece.
              </p>
            </FadeIn>

            <FadeIn delay={0.35}>
              <p className="text-lg md:text-xl text-foreground/70 mb-8 max-w-xl leading-relaxed">
                Chega de anotações no papel, ingredientes perdidos e fechamento de caixa que não bate. O AgilizaFluxo é o parceiro de quem abre e fecha o restaurante todo dia.
              </p>
            </FadeIn>
            
            <FadeIn delay={0.4} className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <Button size="lg" className="rounded-full px-8 h-14 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:-translate-y-1">
                Começar teste grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-base font-semibold bg-white/50 backdrop-blur border-border hover:bg-white/80 transition-all">
                <Play className="mr-2 w-5 h-5 text-primary" fill="currentColor" />
                Ver como funciona
              </Button>
            </FadeIn>

            <FadeIn delay={0.5} className="mt-8 flex items-center gap-4 text-sm text-foreground/60 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Sem cartão de crédito
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Cancele quando quiser
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3} direction="left" className="relative lg:ml-10">
            {/* The Image Wrapper */}
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-[4/5] sm:aspect-square lg:aspect-[4/5] ring-1 ring-border border-[8px] border-white/50 backdrop-blur-sm">
              <img 
                src={heroImage} 
                alt="Cozinha movimentada de restaurante profissional" 
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Floating UI Element 1 */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-black/5 animate-float" style={{ animationDelay: '0s' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Mesa 14</span>
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Preparando</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>1x Pizza Margherita G</span>
                    <span>R$ 65,00</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>2x Refrigerante Lata</span>
                    <span>R$ 14,00</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ 79,00</span>
                </div>
              </div>
            </div>

            {/* Floating Element 2 */}
            <div className="absolute top-12 -left-6 sm:-left-12 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-black/5 flex items-center gap-4 animate-float" style={{ animationDelay: '1.5s' }}>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Tempo Médio</p>
                <p className="font-display font-black text-xl text-foreground">12 min</p>
              </div>
            </div>
            
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
