import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    console.log('🔍 Instagram API Debug called');
    
    // ファイルシステムからAPIファイルの存在を確認
    const apiPath = path.join(process.cwd(), 'src/app/api/instagram');
    const files = fs.readdirSync(apiPath, { withFileTypes: true });
    
    const apiEndpoints = files
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .map(name => {
        const routePath = path.join(apiPath, name, 'route.ts');
        const exists = fs.existsSync(routePath);
        return {
          name,
          path: `/api/instagram/${name}`,
          exists,
          fullPath: routePath
        };
      });

    return NextResponse.json({
      success: true,
      message: 'Instagram API Debug',
      timestamp: new Date().toISOString(),
      apiPath,
      endpoints: apiEndpoints,
      totalEndpoints: apiEndpoints.length,
      existingEndpoints: apiEndpoints.filter(ep => ep.exists).length
    });
  } catch (error) {
    console.error('❌ Instagram API Debug error:', error);
    return NextResponse.json(
      { 
        error: 'Instagram API Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
