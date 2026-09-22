import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Fuente de verdad de los reportes: el Worker svi-reports (Cloudflare R2). Subir un PDF
// en reports.svinvesting.com lo publica aquí sin commits ni redeploys. Este endpoint solo
// proxya el listado del Worker para mantener la misma forma que consume ReportsArchive.
const REPORTS_LIST_URL = 'https://reports.svinvesting.com/list';

export async function GET() {
  try {
    const response = await fetch(REPORTS_LIST_URL, { next: { revalidate: 60 } });
    if (!response.ok) return NextResponse.json({ years: [] });
    const data = await response.json();
    return NextResponse.json({ years: data.years ?? [] });
  } catch {
    return NextResponse.json({ years: [] });
  }
}
