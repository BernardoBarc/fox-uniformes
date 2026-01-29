"use client";
import React from "react";

type Variant = "gold" | "ghost" | "cta" | "primary";

type ButtonProps = (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }) | (React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string });

export default function Button({
  children,
  variant = "gold",
  className = "",
  href,
  ...props
}: ButtonProps & { variant?: Variant; className?: string; href?: string }) {
  const base = "inline-flex items-center justify-center rounded-lg font-semibold transition";
  const variants: Record<Variant, string> = {
    gold: "btn-gold",
    ghost: "btn-ghost",
    cta: "btn-cta",
    primary: "button-primary",
  };

  const classes = `${base} ${variants[variant]} ${className}`;

  if (href) {
    // Rendera um link estilizado quando href for passado
    return (
      <a href={href} className={classes} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
