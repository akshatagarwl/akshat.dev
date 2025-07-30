import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const filePath = path.join(process.cwd(), 'public', 'resume.pdf');
  const stat = fs.statSync(filePath);

  const response = new NextResponse(fs.readFileSync(filePath), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size.toString(),
      'Content-Disposition': 'inline; filename="resume.pdf"',
    },
  });
  return response;
}

