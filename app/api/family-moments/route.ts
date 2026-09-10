import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CloudinaryResource = {
  asset_id?: string;
  context?: { custom?: Record<string, string> };
  created_at?: string;
  display_name?: string;
  height?: number;
  original_filename?: string;
  public_id?: string;
  secure_url?: string;
  width?: number;
};

type CloudinarySearchResponse = {
  resources?: CloudinaryResource[];
};

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const folder = process.env.CLOUDINARY_FAMILY_MOMENTS_FOLDER?.trim();

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function quoteExpression(value: string) {
  return value.replace(/["\\]/g, '\\$&');
}

function optimizedUrl(url: string) {
  return url.replace(
    '/image/upload/',
    '/image/upload/f_auto,q_auto,dpr_auto,w_1600,c_limit/',
  );
}

async function searchImages(expression: string) {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName!)}/resources/search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expression,
        max_results: 18,
        sort_by: [{ created_at: 'desc' }],
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Cloudinary returned ${response.status}`);
  }

  const data = (await response.json()) as CloudinarySearchResponse;
  return data.resources ?? [];
}

export async function GET() {
  if (!cloudName || !apiKey || !apiSecret || !folder) {
    return json({ status: 'unconfigured', moments: [] });
  }

  const quotedFolder = quoteExpression(folder);
  const expressions = [
    `resource_type:image AND asset_folder="${quotedFolder}"`,
    `resource_type:image AND asset_folder:${quotedFolder}/*`,
    `resource_type:image AND folder="${quotedFolder}"`,
    `resource_type:image AND public_id:${quotedFolder}/*`,
  ];

  try {
    let resources: CloudinaryResource[] = [];
    let hasSuccessfulSearch = false;

    for (const expression of expressions) {
      try {
        resources = await searchImages(expression);
        hasSuccessfulSearch = true;
        if (resources.length) break;
      } catch {
        // Cloudinary supports different folder fields in its two folder modes.
      }
    }

    if (!hasSuccessfulSearch) {
      return json({ status: 'unavailable', moments: [] }, 502);
    }

    const moments = resources
      .filter((resource) => resource.secure_url)
      .map((resource, index) => ({
        id: resource.asset_id || resource.public_id || String(index),
        src: optimizedUrl(resource.secure_url!),
        alt:
          resource.context?.custom?.alt ||
          resource.context?.custom?.caption ||
          `Khoảnh khắc gia đình ${index + 1}`,
        caption:
          resource.context?.custom?.caption ||
          'Khoảnh khắc gia đình',
        createdAt: resource.created_at || null,
        width: resource.width || null,
        height: resource.height || null,
      }));

    return json({ status: 'ready', moments });
  } catch {
    return json({ status: 'unavailable', moments: [] }, 502);
  }
}
