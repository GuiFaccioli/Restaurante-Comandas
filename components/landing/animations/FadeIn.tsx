import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
interface FadeInProps extends HTMLAttributes<HTMLDivElement> { children: ReactNode; className?: string; direction?: "up" | "down" | "left" | "right" | "none"; delay?: number; duration?: number; }
export function FadeIn({ children, className, direction: _direction, delay = 0, duration: _duration, ...props }: FadeInProps) { return <div style={{ animationDelay: `${delay}s` }} className={cn("animate-in fade-in slide-in-from-bottom-4 duration-700", className)} {...props}>{children}</div>; }
