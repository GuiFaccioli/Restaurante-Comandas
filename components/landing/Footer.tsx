import { ChefHat } from "lucide-react";


export function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-6">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <ChefHat size={24} strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-foreground">
                Agiliza<span className="text-primary">Fluxo</span>
              </span>
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              O sistema de gestão feito para quem coloca a mão na massa e faz o restaurante acontecer todo dia.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Produto</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Comandas Digitais</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Controle de Estoque</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ficha Técnica</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Integração iFood</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Empresa</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Sobre nós</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Preços</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog do Restaurante</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Suporte</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">WhatsApp</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Treinamentos</a></li>
            </ul>
          </div>
          
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} AgilizaFluxo. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
