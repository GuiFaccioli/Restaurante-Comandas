"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Recursos", href: "#recursos" },
    { label: "Como Funciona", href: "#como-funciona" },
    { label: "Depoimentos", href: "#depoimentos" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md group-hover:bg-primary/90 transition-colors">
              <ChefHat size={24} strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Agiliza<span className="text-primary">Fluxo</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="/auth/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
              Entrar
            </a>
            <a href="/auth/sign-up" className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all">
              Testar Grátis
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border-b border-border p-4 shadow-lg md:hidden flex flex-col gap-4"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-base font-medium p-2 text-foreground/80 hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="h-px bg-border my-2" />
            <a
              href="/auth/sign-in"
              className="text-base font-medium p-2 text-foreground/80 hover:bg-muted rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Entrar
            </a>
            <a href="/auth/sign-up" onClick={() => setIsMobileMenuOpen(false)} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-primary-foreground mt-2">
              Testar Grátis
            </a>
          </div>
        )}
      
    </header>
  );
}
