import { ImageResponse } from 'next/og';
import { sql } from "@vercel/postgres";

export const runtime = 'edge';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // URLにテキストが混入した場合を考慮し、最初のUUID部分(36文字)のみを抽出
  const uuid = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || id;

  const { rows } = await sql`
    SELECT * FROM meal_logs WHERE share_id = ${uuid} LIMIT 1;
  `;
  const log = rows[0];

  if (!log) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Not Found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const calories = Math.round(log.total_calories);
  const p = Math.round(log.total_protein * 10) / 10;
  const f = Math.round(log.total_fat * 10) / 10;
  const c = Math.round(log.total_carbs * 10) / 10;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8faf9', // sage-50
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Image with blur effect for "Atmosphere" */}
        {log.image_url && (
          <img
            src={log.image_url}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.85,
            }}
          />
        )}

        {/* Gradient Overlay for "Emoi" feeling */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Content Overlay */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '100%',
            height: '100%',
            padding: '48px',
            color: 'white',
          }}
        >
          {/* Main Stats Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '32px 48px',
              borderRadius: '32px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              alignItems: 'center',
              border: '2px solid rgba(44, 82, 52, 0.1)',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a6741', marginBottom: '8px' }}>
              CALORIE REPORT
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontSize: '96px', fontWeight: '900', color: '#1a2e1c', lineHeight: 1 }}>
                {calories}
              </div>
              <div style={{ fontSize: '32px', color: '#4a6741', fontWeight: 'bold' }}>kcal</div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '32px',
                marginTop: '24px',
                borderTop: '1px solid #e1e8df',
                paddingTop: '24px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', color: '#6d8a64', marginBottom: '4px' }}>Protein</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d4d2b' }}>{p}g</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', color: '#6d8a64', marginBottom: '4px' }}>Fat</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d4d2b' }}>{f}g</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', color: '#6d8a64', marginBottom: '4px' }}>Carbs</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d4d2b' }}>{c}g</div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '12px 24px',
              borderRadius: '24px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ fontSize: '28px' }}>🥗</div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                color: 'white',
              }}
            >
              LogEats AI Analytics
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
