import { FadeIn } from "./animations/FadeIn";
import { Check, Receipt, PackageSearch, UtensilsCrossed } from "lucide-react";
const comandasImg = "/landing/comandas.jpg";
const estoqueImg = "/landing/estoque.jpg";
const fichaImg = "/landing/ficha-tecnica.jpg";
import { cn } from "@/lib/utils";

interface FeatureProps {
  title: string;
  badge: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  items: string[];
  reversed?: boolean;
}

function FeatureRow({ title, badge, description, image, icon, items, reversed = false }: FeatureProps) {
  return (
    <div className={cn("grid lg:grid-cols-2 gap-12 items-center py-20", reversed && "lg:flex-row-reverse")}>
      <FadeIn direction={reversed ? "left" : "right"} className={cn("order-2", reversed ? "lg:order-2" : "lg:order-1")}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
          <span className="text-sm font-bold uppercase tracking-wider text-primary">{badge}</span>
        </div>
        
        <h3 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground leading-tight">
          {title}
        </h3>
        
        <p className="text-lg text-foreground/70 mb-8 leading-relaxed">
          {description}
        </p>
        
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-foreground/80 font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </FadeIn>
      
      <FadeIn direction={reversed ? "right" : "left"} className={cn("order-1 relative", reversed ? "lg:order-1" : "lg:order-2")}>
        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-[4/3] ring-1 ring-border">
          <img src={image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
        </div>
        {/* Decorative dot pattern block */}
        <div className="absolute -bottom-6 -z-10 w-64 h-64 opacity-50" style={{ 
          backgroundImage: 'radial-gradient(circle at center, hsl(var(--primary)) 2px, transparent 2.5px)', 
          backgroundSize: '24px 24px',
          right: reversed ? 'auto' : '-1.5rem',
          left: reversed ? '-1.5rem' : 'auto'
        }} />
      </FadeIn>
    </div>
  );
}

export function Features() {
  return (
    <section id="recursos" className="py-24 bg-card">
      <div className="container mx-auto px-4 md:px-6">
        
        <FadeIn className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-black mb-6 text-foreground">
            A casa em ordem. <br/>Da porta pra dentro.
          </h2>
          <p className="text-xl text-muted-foreground">
            Três partes da operação trabalhando juntas para deixar o dia mais claro e leve para sua equipe.
          </p>
        </FadeIn>

        <div className="flex flex-col">
          <FeatureRow 
            badge="Operação Ágil"
            title="Comandas digitais que não perdem pedidos."
            description="Cada pedido segue para a área certa e fica visível para quem precisa cuidar dele. Do salão à cozinha, todo mundo trabalha com a mesma informação."
            icon={<Receipt size={24} />}
            image={comandasImg}
            items={[
              "Separação automática de praças (bar, cozinha e forno)",
              "Andamento do pedido visível para salão, cozinha e caixa",
              "Fechamento de conta com divisão por pessoa",
              "Mesas e atendimentos organizados no mesmo fluxo"
            ]}
          />
          
          <FeatureRow 
            badge="Sem Desperdício"
            title="Estoque que acompanha cada pedido."
            description="O pedido do garçom já movimenta os ingredientes da ficha técnica automaticamente. Quando o saldo chega ao mínimo configurado, a lista de compras se atualiza sozinha — uma preocupação a menos."
            icon={<PackageSearch size={24} />}
            image={estoqueImg}
            reversed={true}
            items={[
              "Cada pedido dá baixa nos insumos da ficha técnica",
              "A lista de compras é gerada conforme o estoque vai baixando",
              "Entradas, perdas e contagens ficam registradas no histórico",
              "Estoque mínimo e ideal ajudam a planejar a próxima compra"
            ]}
          />

          <FeatureRow 
            badge="Lucro Protegido"
            title="Ficha técnica para conhecer cada prato."
            description="Os insumos e as quantidades de cada receita ficam reunidos em um só lugar. O custo e a margem estimada aparecem com clareza, sem conta de cabeça."
            icon={<UtensilsCrossed size={24} />}
            image={fichaImg}
            items={[
              "Custo calculado a partir dos insumos cadastrados",
              "Margem estimada para cada produto",
              "Receitas vinculadas aos produtos do cardápio",
              "Custos recalculados quando os insumos são atualizados"
            ]}
          />
        </div>
      </div>
    </section>
  );
}
