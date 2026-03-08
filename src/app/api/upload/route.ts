import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { extractTextFromPdf } from '@/lib/pdf';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const projectId = formData.get('projectId') as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: 'file and projectId required' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 });
  }

  try {
    // Parse PDF text — this is the only thing we actually need
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractTextFromPdf(buffer);

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from PDF. The file may be image-based or empty.' }, { status: 422 });
    }

    // Verify project ownership
    const supabase = await createServerClient();
    const { data: ownedProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', session.sub)
      .single();

    if (!ownedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project with parsed text
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        brief_parsed: extractedText,
      })
      .eq('id', projectId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ text: extractedText });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload] PDF parse error:', message);
    return NextResponse.json({ error: `Failed to parse PDF: ${message}` }, { status: 500 });
  }
}
