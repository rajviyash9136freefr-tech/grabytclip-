interface JsonLdProps {
  id: string;
  data: Record<string, unknown>;
}

/** Renders a JSON-LD script block. `id` keeps multiple blocks unique in the DOM. */
export function JsonLd({ id, data }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
