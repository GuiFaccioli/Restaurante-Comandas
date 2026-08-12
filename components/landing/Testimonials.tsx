import { FadeIn } from "./animations/FadeIn";
import { Star } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      quote: "Antes a gente perdia uns 3 pedidos por fim de semana porque o papel rasgava ou molhava na cozinha. Desde que instalamos o Agiliza, o estresse acabou.",
      author: "Carlos Mendes",
      role: "Dono, Cantina do Carlão",
      initials: "CM"
    },
    {
      quote: "Eu achava que dava lucro na parmegiana até colocar na Ficha Técnica deles. Descobri que pagava pra trabalhar. Ajustei R$4 e a margem voltou. Recomendo demais.",
      author: "Juliana Silva",
      role: "Sócia, Nonna Pizza",
      initials: "JS"
    },
    {
      quote: "Sistema leve, não trava no meio do movimento. Meu chapeiro que nem gosta de celular aprendeu a usar a tela da cozinha no primeiro dia.",
      author: "Marcos 'Tigrão'",
      role: "Proprietário, Tigrão Lanches",
      initials: "MT"
    }
  ];

  return (
    <section id="depoimentos" className="py-24 bg-card">
      <div className="container mx-auto px-4 md:px-6">
        
        <FadeIn className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-black mb-6 text-card-foreground">
            Quem usa, não larga mais.
          </h2>
          <p className="text-xl text-muted-foreground">
            Feito para resolver a vida de quem não tem tempo a perder.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <FadeIn key={i} delay={i * 0.1} className="bg-background rounded-3xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow relative">
              <div className="flex gap-1 mb-6 text-primary">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={18} fill="currentColor" />
                ))}
              </div>
              <p className="text-lg text-foreground/80 font-medium mb-8 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {testimonial.initials}
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{testimonial.author}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
