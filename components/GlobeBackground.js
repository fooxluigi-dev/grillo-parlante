import React, { useEffect, useRef } from 'react';
import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Continent outlines projected onto a sphere (simplified lat/lon → x/y)
function rotatePoint(lat, lon, angle) {
  // Simple 3D rotation around Y axis
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + angle) * Math.PI / 180;
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  return { x, y, z };
}

function project(x, y, z, radius) {
  // Perspective projection
  const scale = radius / (radius + z * 0.8);
  return {
    px: x * radius * scale,
    py: y * radius * scale,
    scale,
    z,
  };
}

const CONTINENT_PATHS = [
  // North America
  [[25,-130],[30,-120],[35,-115],[40,-110],[45,-115],[48,-125],[50,-130],[48,-135],[45,-140],[40,-145],[30,-140],[25,-135],[22,-130]],
  [[50,-130],[55,-125],[60,-120],[62,-118],[60,-115],[55,-120],[50,-125]],
  [[62,-118],[65,-110],[70,-95],[72,-85],[70,-78],[65,-75],[60,-72],[55,-72],[50,-75],[48,-80],[50,-82],[55,-85],[60,-88],[62,-95],[60,-100],[55,-105],[50,-108],[48,-112],[50,-115],[55,-118],[60,-115],[62,-118]],
  // South America
  [[15,-80],[10,-75],[5,-70],[0,-65],[-5,-68],[-10,-70],[-15,-72],[-20,-70],[-25,-68],[-30,-70],[-35,-72],[-40,-75],[-42,-78],[-40,-80],[-35,-80],[-30,-78],[-25,-75],[-20,-72],[-15,-70],[-10,-68],[-5,-65],[0,-62],[5,-60],[10,-65],[15,-70],[15,-80]],
  [[-42,-78],[-45,-80],[-50,-82],[-55,-78],[-52,-75],[-48,-72],[-45,-75],[-42,-78]],
  // Europe
  [[35,-5],[38,0],[40,5],[42,10],[45,15],[48,18],[50,20],[52,22],[55,20],[58,18],[60,15],[62,12],[65,10],[68,8],[70,5],[68,2],[65,0],[60,-2],[55,-4],[50,-5],[45,-6],[40,-8],[35,-5]],
  [[35,-5],[38,-8],[40,-10],[42,-8],[40,-5],[38,-3],[35,-5]],
  [[50,-5],[52,-8],[55,-10],[58,-8],[55,-6],[52,-4],[50,-5]],
  // Africa
  [[30,-5],[30,-10],[28,-15],[25,-20],[22,-25],[20,-30],[18,-35],[15,-40],[12,-45],[10,-50],[8,-55],[5,-60],[2,-62],[0,-60],[-2,-55],[-5,-50],[-8,-45],[-10,-40],[-12,-35],[-15,-30],[-18,-25],[-20,-20],[-22,-15],[-20,-10],[-15,-5],[-10,0],[-5,5],[0,10],[5,15],[10,20],[15,22],[20,25],[25,20],[28,15],[30,10],[32,5],[30,0],[30,-5]],
  // Asia
  [[45,15],[48,20],[50,25],[52,30],[55,35],[58,40],[60,45],[62,50],[65,55],[68,60],[70,65],[72,70],[75,75],[78,80],[80,85],[78,90],[75,95],[72,100],[70,105],[68,110],[65,115],[62,120],[60,125],[58,130],[55,135],[52,140],[50,145],[48,150],[45,155],[42,160],[40,165],[38,170],[35,175],[32,180],[30,175],[28,170],[25,165],[22,160],[20,155],[18,150],[15,145],[12,140],[10,135],[8,130],[5,125],[2,120],[0,115],[-2,110],[-5,105],[-8,100],[-10,95],[-12,90],[-15,85],[-18,80],[-20,75],[-18,70],[-15,65],[-12,60],[-10,55],[-8,50],[-5,45],[-2,40],[0,35],[2,30],[5,25],[8,20],[10,15],[15,18],[20,22],[25,20],[30,18],[35,15],[40,15],[45,15]],
  // Southeast Asia islands
  [[-5,105],[0,108],[5,110],[8,115],[5,118],[0,120],[-5,118],[-8,115],[-5,110],[-5,105]],
  [[-8,115],[-10,120],[-8,125],[-5,128],[-2,125],[0,120],[2,118],[0,115],[-5,112],[-8,115]],
  [[10,118],[12,120],[15,122],[18,120],[15,118],[12,115],[10,118]],
  // Australia
  [[-25,110],[-22,115],[-20,120],[-22,125],[-25,130],[-28,135],[-30,140],[-32,145],[-35,148],[-38,150],[-40,148],[-42,145],[-40,140],[-38,135],[-35,130],[-33,125],[-30,120],[-28,115],[-25,110]],
  // Greenland
  [[72,-55],[75,-50],[80,-45],[82,-40],[80,-35],[78,-30],[75,-32],[72,-35],[70,-40],[68,-45],[70,-50],[72,-55]],
  // Antarctica
  [[-65,-180],[-68,-170],[-70,-160],[-72,-150],[-75,-140],[-78,-130],[-80,-120],[-82,-110],[-80,-100],[-78,-90],[-75,-80],[-72,-70],[-70,-60],[-68,-50],[-70,-40],[-72,-30],[-75,-20],[-78,-10],[-80,0],[-82,10],[-80,20],[-78,30],[-75,40],[-72,50],[-70,60],[-68,70],[-65,80],[-65,90],[-68,100],[-70,110],[-72,120],[-75,130],[-78,140],[-80,150],[-78,160],[-75,170],[-72,180],[-70,-170],[-68,-160],[-65,-150],[-65,-180]],
];

export default function GlobeBackground({ opacity = 0.15, size = Math.min(W * 1.2, H * 1.2) }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = Platform.OS === 'web' ? window.devicePixelRatio || 1 : 2;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const radius = size * 0.38;
    const cx = size / 2;
    const cy = size / 2;

    let lastTime = 0;

    const draw = (time) => {
      const dt = lastTime ? (time - lastTime) / 1000 : 0.016;
      lastTime = time;

      // Slow rotation
      angleRef.current += dt * 0.1;
      const angle = angleRef.current;

      ctx.clearRect(0, 0, size, size);

      // Draw glow
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.2);
      glow.addColorStop(0, 'rgba(194,85,58,0.04)');
      glow.addColorStop(0.5, 'rgba(194,85,58,0.02)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // Draw sphere outline
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      const sphereGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
      sphereGrad.addColorStop(0, 'rgba(200,200,200,0.04)');
      sphereGrad.addColorStop(0.5, 'rgba(160,160,160,0.02)');
      sphereGrad.addColorStop(1, 'rgba(100,100,100,0.01)');
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Grid lines
      ctx.strokeStyle = 'rgba(194,85,58,0.06)';
      ctx.lineWidth = 0.5;

      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath();
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const lon = (i / steps) * 360 - 180;
          const { px, py, z } = project(
            ...Object.values(rotatePoint(lat, lon, angle)),
            radius
          );
          if (z < 0) continue;
          const x = cx + px;
          const y = cy + py;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Longitude lines
      for (let lon = 0; lon < 360; lon += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 5) {
          const { px, py, z } = project(
            ...Object.values(rotatePoint(lat, lon, angle)),
            radius
          );
          if (z < 0) continue;
          const x = cx + px;
          const y = cy + py;
          if (lat === -90) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Continents
      CONTINENT_PATHS.forEach((path) => {
        ctx.beginPath();
        let started = false;
        path.forEach(([lat, lon]) => {
          const { px, py, z } = project(
            ...Object.values(rotatePoint(lat, lon, angle)),
            radius
          );
          if (z < 0) return;
          const x = cx + px;
          const y = cy + py;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(194,85,58,0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(194,85,58,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Atmosphere glow
      const atmGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.1);
      atmGrad.addColorStop(0, 'rgba(255,255,255,0)');
      atmGrad.addColorStop(0.5, 'rgba(194,85,58,0.02)');
      atmGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = atmGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [size]);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      overflow: 'hidden',
      opacity,
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          filter: 'blur(1px)',
        }}
      />
    </div>
  );
}
