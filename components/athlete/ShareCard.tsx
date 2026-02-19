// ShareCard — branded image card rendered off-screen for capture
// Uses ONLY inline styles (Tailwind won't work in detached DOM)

import React from 'react';

export interface ShareData {
  type: 'benchmark' | 'lift' | 'wod_section';
  athleteName?: string;
  date: string;
  resultLabel: string;
  resultValue: string;
  resultSubLabel?: string;
  isPR?: boolean;
  scalingLevel?: string;
}

interface ShareCardProps {
  data: ShareData;
  logoBase64: string;
}

function getTypeBadge(data: ShareData): string {
  if (data.type === 'lift' && data.isPR) return 'NEW LIFT PR';
  if (data.type === 'lift') return 'LIFT RESULT';
  if (data.type === 'benchmark' && data.isPR) return 'BENCHMARK PR';
  if (data.type === 'benchmark') return 'BENCHMARK';
  if (data.isPR) return 'PERSONAL RECORD';
  return 'WORKOUT RESULT';
}

function getScalingColor(level: string): string {
  switch (level) {
    case 'Rx': return '#dc2626';
    case 'Sc1': return '#1e40af';
    case 'Sc2': return '#3b82f6';
    case 'Sc3': return '#60a5fa';
    default: return '#6b7280';
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ShareCard({ data, logoBase64 }: ShareCardProps) {
  const badge = getTypeBadge(data);

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0d1b2a 100%)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        padding: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* Header: Logo + Gym Name */}
      <div style={{ textAlign: 'center' }}>
        {logoBase64 && (
          <img
            src={logoBase64}
            alt=""
            style={{ width: 120, height: 120, borderRadius: 24, marginBottom: 24 }}
          />
        )}
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: 6,
            lineHeight: 1.2,
          }}
        >
          THE FORGE
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#20a5bf',
            letterSpacing: 8,
            marginTop: 8,
          }}
        >
          FUNCTIONAL FITNESS
        </div>
      </div>

      {/* Center: Badge + Result */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        {/* Type Badge */}
        <div
          style={{
            display: 'inline-block',
            background: data.isPR
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #178da6, #14758c)',
            color: '#ffffff',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            padding: '14px 40px',
            borderRadius: 50,
            marginBottom: 48,
          }}
        >
          {data.isPR && '\u{1F3C6} '}{badge}
        </div>

        {/* Result Label (exercise/benchmark name) */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          {data.resultLabel}
        </div>

        {/* Main Result Value */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {data.resultValue}
        </div>

        {/* Sub-label */}
        {data.resultSubLabel && (
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#20a5bf',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            {data.resultSubLabel}
          </div>
        )}
      </div>

      {/* Footer: Athlete + Date + Scaling */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        {/* Scaling Badge */}
        {data.scalingLevel && (
          <div
            style={{
              display: 'inline-block',
              background: getScalingColor(data.scalingLevel),
              color: '#ffffff',
              fontSize: 20,
              fontWeight: 700,
              padding: '8px 24px',
              borderRadius: 8,
              marginBottom: 24,
              letterSpacing: 2,
            }}
          >
            {data.scalingLevel}
          </div>
        )}

        {/* Athlete Name */}
        {data.athleteName && (
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: '#ffffff',
              marginBottom: 8,
            }}
          >
            {data.athleteName}
          </div>
        )}

        {/* Date */}
        <div
          style={{
            fontSize: 22,
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          {formatDate(data.date)}
        </div>
      </div>
    </div>
  );
}
