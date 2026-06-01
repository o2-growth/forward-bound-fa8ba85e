const TYPEFORM_URL = "https://uqkuwbbfvuarupfsioak.supabase.co/rest/v1";
const TYPEFORM_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxa3V3YmJmdnVhcnVwZnNpb2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjgzMDQsImV4cCI6MjA4NzQ0NDMwNH0.NCtHj-3eM4RNDqPUlHHdB9dgCberq57wYyh_mlRa18c";

export async function fetchTypeformView<T = any>(
  view: string,
  query = ""
): Promise<T[]> {
  const url = `${TYPEFORM_URL}/${view}${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: TYPEFORM_KEY,
      Authorization: `Bearer ${TYPEFORM_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Typeform view ${view} failed (${res.status}): ${text}`);
  }
  return res.json();
}
