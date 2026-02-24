import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { extractTextFromPdf } from '@/lib/pdf';

export async function POST(request: NextRequest) {
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

  const supabase = createServerClient();

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `briefs/${projectId}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('briefs')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Parse PDF text
  const extractedText = await extractTextFromPdf(buffer);

  // Update project
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      brief_pdf_url: storagePath,
      brief_parsed: extractedText,
    })
    .eq('id', projectId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ text: extractedText, storagePath });
}
