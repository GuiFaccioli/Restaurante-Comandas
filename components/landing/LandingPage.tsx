import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { VibeSection } from "./VibeSection";
import { Testimonials } from "./Testimonials";
import { CTA } from "./CTA";
import { Footer } from "./Footer";

export function LandingPage() {
  return <div className="min-h-screen bg-background text-foreground font-sans"><Navbar /><main><Hero /><Features /><VibeSection /><Testimonials /><CTA /></main><Footer /></div>;
}
