"use client";
import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/lib/contracts";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="SCOUT by SalesHospitality home"
    >
      <img
        className="brand-main"
        src="/brand/scout-main.webp"
        width={864}
        height={576}
        alt="SCOUT by SalesHospitality"
      />
      <img
        className="brand-icon"
        src="/brand/scout-icon.webp"
        width={256}
        height={256}
        alt="SCOUT by SalesHospitality"
      />
    </Link>
  );
}
export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className={`tag ${category}`}>
      {category[0].toUpperCase() + category.slice(1)}
    </span>
  );
}
export function ArrowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function DateText({ value }: { value: string | null }) {
  return (
    <>
      {value
        ? new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(value))
        : "Unknown"}
    </>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Compass size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
