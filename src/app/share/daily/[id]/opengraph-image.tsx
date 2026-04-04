import { ImageResponse } from 'next/og';
import { sql } from "@vercel/postgres";

export const runtime = 'edge';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // share_id からデータを取得
  const { rows: shareRows } = await sql`
    SELECT * FROM daily_shares WHERE share_id = ${id} LIMIT 1;
  `;
  if (shareRows.length === 0) return new ImageResponse(<div>Not Found</div>);

  const share = shareRows[0];
  const dateStr = new Date(share.share_date).toISOString().split('T')[0];

  // 当日の食事ログを取得
  const { rows: logs } = await sql`
    SELECT total_calories, total_protein, total_fat, total_carbs, image_url 
    FROM meal_logs 
    WHERE user_id = ${share.user_id} 
      AND logged_at::date = ${dateStr}::date;
  `;

  // ユーザーの目標設定を取得
  const { rows: userRows } = await sql`
    SELECT target_calories FROM users WHERE id = ${share.user_id} LIMIT 1;
  `;

  const total = logs.reduce((acc, l) => ({
    calories: acc.calories + l.total_calories,
    protein: acc.protein + l.total_protein,
    fat: acc.fat + l.total_fat,
    carbs: acc.carbs + l.total_carbs,
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const target = userRows[0]?.target_calories || 2000;
  const progress = Math.min(100, Math.round((total.calories / target) * 100));
  
  // 代表的な画像を取得
  const displayImage = logs.find(l => l.image_url)?.image_url;

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
          background: '#1a2e1c', // Dark Sage
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Image with blur */}
        {displayImage && (
          <img
            src={displayImage}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.3,
            }}
          />
        )}

        {/* Content Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '48px 64px',
            borderRadius: '48px',
            width: '900px',
            boxShadow: '0 40px 60px -15px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#4a6741', marginBottom: '12px', letterSpacing: '2px' }}>
            DAILY MEAL REPORT
          </div>
          
          <div style={{ fontSize: '20px', color: '#6d8a64', marginBottom: '32px' }}>
            {new Date(share.share_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ fontSize: '128px', fontWeight: '900', color: '#1a2e1c', lineHeight: 1 }}>
              {Math.round(total.calories)}
            </div>
            <div style={{ fontSize: '48px', color: '#4a6741', fontWeight: '800' }}>kcal</div>
          </div>

          {/* Progress Bar Container */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#4a6741' }}>GOAL PROGRESS</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#1a2e1c' }}>{progress}%</div>
            </div>
            <div style={{ width: '100%', height: '24px', background: '#e1e8df', borderRadius: '12px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#2d4d2b', borderRadius: '12px' }} />
            </div>
          </div>

          {/* Macros Container */}
          <div style={{ display: 'flex', gap: '64px', marginTop: '48px', borderTop: '2px solid #e1e8df', paddingTop: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: '#6d8a64', marginBottom: '8px' }}>P</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#1a2e1c' }}>{Math.round(total.protein)}g</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: '#6d8a64', marginBottom: '8px' }}>F</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#1a2e1c' }}>{Math.round(total.fat)}g</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: '#6d8a64', marginBottom: '8px' }}>C</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#1a2e1c' }}>{Math.round(total.carbs)}g</div>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div style={{ position: 'absolute', bottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '32px' }}>🥗</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>LogEats AI Analytics</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
