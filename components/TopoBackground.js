import React from 'react';

const TOPO_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <path d="M0,15 Q25,5 50,20 T100,10 T150,25 T200,15" stroke="#c2553a" stroke-width="3.5" fill="none" opacity="0.9"/>
  <path d="M0,30 Q30,40 55,25 T100,35 T150,25 T200,40" stroke="#c2553a" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M0,45 Q20,40 45,50 T90,40 T150,50 T200,40" stroke="#c2553a" stroke-width="3.5" fill="none" opacity="0.9"/>
  <path d="M0,60 Q35,55 60,65 T105,55 T150,65 T200,55" stroke="#c2553a" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M0,75 Q25,85 50,70 T100,80 T150,70 T200,85" stroke="#c2553a" stroke-width="3.5" fill="none" opacity="0.9"/>
  <path d="M0,90 Q30,85 55,95 T95,85 T150,95 T200,85" stroke="#c2553a" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M0,105 Q20,100 45,110 T90,100 T150,110 T200,100" stroke="#c2553a" stroke-width="3.5" fill="none" opacity="0.9"/>
  <path d="M0,120 Q35,115 60,125 T105,115 T150,125 T200,115" stroke="#c2553a" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M0,135 Q25,145 50,130 T100,140 T150,130 T200,145" stroke="#c2553a" stroke-width="3.5" fill="none" opacity="0.9"/>
  <path d="M0,150 Q30,145 55,155 T95,145 T150,155 T200,145" stroke="#c2553a" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M0,165 Q20,160 45,170 T90,160 T150,170 T200,160" stroke="#c2553a" stroke-width="3.5" fill="none" opacity="0.9"/>
  <path d="M0,180 Q35,175 60,185 T105,175 T150,185 T200,175" stroke="#c2553a" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M0,195 Q25,190 50,200 T100,190 T150,200 T200,190" stroke="#c2553a" stroke-width="3.5" fill="none" opacity="0.9"/>
</svg>
`);

export default function TopoBackground() {
  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      pointerEvents: 'none',
      backgroundImage: `url("data:image/svg+xml,${TOPO_SVG}")`,
      backgroundRepeat: 'repeat',
      backgroundSize: '200px 200px',
      backgroundColor: '#f5efe6',
    }
  });
}
