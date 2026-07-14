"use client";

interface Props {
  condition: number;
  isDay: boolean;
  size?: number;
}

export default function WeatherIcon({ condition, isDay, size = 48 }: Props) {
  if (condition === 0) return <SunMoon isDay={isDay} size={size} />;
  if (condition <= 2) return <PartlyCloudy isDay={isDay} size={size} />;
  if (condition === 3) return <Cloudy size={size} />;
  if (condition === 4) return <Overcast size={size} />;
  if (condition === 10 || condition === 45) return <Fog size={size} />;
  if (condition <= 61) return <RainLight isDay={isDay} size={size} />;
  if (condition <= 65) return <RainHeavy isDay={isDay} size={size} />;
  if (condition === 80) return <Shower isDay={isDay} size={size} />;
  if (condition >= 95) return <Thunder size={size} />;
  return <Cloudy size={size} />;
}

function SunMoon({ isDay, size }: { isDay: boolean; size: number }) {
  if (isDay) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64">
        <style>{`
          @keyframes sunPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
          @keyframes sunRays { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        `}</style>
        <g style={{ transformOrigin: "center", animation: "sunRays 20s linear infinite" }}>
          {[0,45,90,135,180,225,270,315].map((a) => (
            <line key={a} x1="32" y1="8" x2="32" y2="14"
              stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"
              transform={`rotate(${a} 32 32)`} opacity={0.7} />
          ))}
        </g>
        <circle cx="32" cy="32" r="12" fill="#fbbf24"
          style={{ animation: "sunPulse 3s ease-in-out infinite", transformOrigin: "center" }} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <style>{`@keyframes moonGlow { 0%,100%{opacity:0.3} 50%{opacity:0.6} }`}</style>
      <circle cx="32" cy="32" r="16" fill="#e2e8f0" opacity={0.15}
        style={{ animation: "moonGlow 4s ease-in-out infinite" }} />
      <path d="M38 18a16 16 0 1 0 0 28 12 12 0 0 1 0-28z" fill="#cbd5e1" />
      <circle cx="28" cy="26" r="1.5" fill="#94a3b8" opacity={0.5} />
      <circle cx="35" cy="34" r="1" fill="#94a3b8" opacity={0.4} />
    </svg>
  );
}

function PartlyCloudy({ isDay, size }: { isDay: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <style>{`
        @keyframes cloudDrift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
      `}</style>
      {isDay ? (
        <circle cx="24" cy="22" r="10" fill="#fbbf24" />
      ) : (
        <path d="M28 12a10 10 0 1 0 0 16 8 8 0 0 1 0-16z" fill="#cbd5e1" />
      )}
      <g style={{ animation: "cloudDrift 4s ease-in-out infinite" }}>
        <ellipse cx="36" cy="38" rx="16" ry="10" fill="#e2e8f0" />
        <ellipse cx="28" cy="36" rx="10" ry="8" fill="#f1f5f9" />
      </g>
    </svg>
  );
}

function Cloudy({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <style>{`@keyframes cloudDrift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(2px)} }`}</style>
      <g style={{ animation: "cloudDrift 5s ease-in-out infinite" }}>
        <ellipse cx="32" cy="30" rx="14" ry="9" fill="#94a3b8" />
        <ellipse cx="24" cy="32" rx="10" ry="7" fill="#cbd5e1" />
        <ellipse cx="40" cy="33" rx="8" ry="6" fill="#cbd5e1" />
      </g>
    </svg>
  );
}

function Overcast({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <style>{`@keyframes cloudDrift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(2px)} }`}</style>
      <g opacity={0.5}>
        <ellipse cx="28" cy="24" rx="12" ry="8" fill="#94a3b8" />
      </g>
      <g style={{ animation: "cloudDrift 6s ease-in-out infinite" }}>
        <ellipse cx="34" cy="34" rx="18" ry="11" fill="#64748b" />
        <ellipse cx="22" cy="36" rx="12" ry="8" fill="#94a3b8" />
      </g>
    </svg>
  );
}

function Fog({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <style>{`@keyframes fogMove { 0%{transform:translateX(-3px);opacity:0.5} 50%{transform:translateX(3px);opacity:0.8} 100%{transform:translateX(-3px);opacity:0.5} }`}</style>
      {[26, 32, 38].map((y, i) => (
        <line key={y} x1="14" y1={y} x2="50" y2={y}
          stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"
          style={{ animation: `fogMove ${3 + i}s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }} />
      ))}
    </svg>
  );
}

function RainDrops({ count, heavy }: { count: number; heavy: boolean }) {
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const x = 18 + (i * 28) / count;
        const delay = i * 0.15;
        return (
          <line key={i} x1={x} y1="44" x2={x - 2} y2={52}
            stroke="#60a5fa" strokeWidth={heavy ? 2 : 1.5} strokeLinecap="round"
            style={{
              animation: `rainDrop ${heavy ? 0.4 : 0.6}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes rainDrop { 0%{transform:translateY(-8px);opacity:1} 100%{transform:translateY(10px);opacity:0} }
      `}</style>
    </g>
  );
}

function RainLight({ isDay, size }: { isDay: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <g>
        <ellipse cx="32" cy="28" rx="16" ry="10" fill="#94a3b8" />
        <ellipse cx="24" cy="30" rx="10" ry="7" fill="#cbd5e1" />
      </g>
      <RainDrops count={3} heavy={false} />
    </svg>
  );
}

function RainHeavy({ isDay, size }: { isDay: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <g>
        <ellipse cx="32" cy="24" rx="18" ry="11" fill="#64748b" />
        <ellipse cx="22" cy="26" rx="12" ry="8" fill="#94a3b8" />
      </g>
      <RainDrops count={5} heavy />
    </svg>
  );
}

function Shower({ isDay, size }: { isDay: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      {isDay ? (
        <circle cx="22" cy="18" r="8" fill="#fbbf24" opacity={0.6} />
      ) : null}
      <g>
        <ellipse cx="34" cy="28" rx="14" ry="9" fill="#94a3b8" />
      </g>
      <RainDrops count={3} heavy={false} />
    </svg>
  );
}

function Thunder({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <style>{`@keyframes flash { 0%,90%,100%{opacity:1} 95%{opacity:0.3} }`}</style>
      <g>
        <ellipse cx="32" cy="22" rx="18" ry="11" fill="#475569" />
        <ellipse cx="22" cy="24" rx="12" ry="8" fill="#64748b" />
      </g>
      <polygon points="30,32 26,44 32,42 28,56 38,38 32,40 36,32"
        fill="#facc15" style={{ animation: "flash 2s ease-in-out infinite" }} />
      <RainDrops count={4} heavy />
    </svg>
  );
}
