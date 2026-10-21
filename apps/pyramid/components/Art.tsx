export function Art({ name, className = "art-spot", alt = "" }: { name: string; className?: string; alt?: string }) {
  return <img className={className} src={`/pyramid/art/${name}.png`} alt={alt} />;
}
