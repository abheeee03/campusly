export function slugify(title: string): string {
  return String(title).trim().replace(/\s+/g, "-");
}

export function deslugify(slug: string): string {
  return String(slug).replace(/-/g, " ");
}
