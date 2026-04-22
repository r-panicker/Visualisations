import { useState, useEffect, useCallback } from "react";

const FONTS_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

const C = {
  bg: "#0f1117", bgCard: "#1a1d27", bgCode: "#141620",
  text: "#e8eaf0", textDim: "#8b90a0", border: "#2a2d3a",
  blue: "#4a9eff", green: "#34d399", amber: "#f59e0b",
  purple: "#a78bfa", red: "#f87171", cyan: "#22d3ee", pink: "#f472b6",
  wg: ["#4a9eff33","#34d39933","#f59e0b33","#a78bfa33","#f8717133","#22d3ee33"],
  wgBorder: ["#4a9eff","#34d399","#f59e0b","#a78bfa","#f87171","#22d3ee"],
};

const CODE = {
  platform: ["cl_platform_id platform;","clGetPlatformIDs(1, &platform, NULL);","cl_device_id device;","clGetDeviceIDs(platform,","    CL_DEVICE_TYPE_GPU, 1, &device, NULL);","cl_context ctx = clCreateContext(","    NULL, 1, &device, NULL, NULL, NULL);"],
  kernel: ["__kernel void vec_add(","    __global const float* A,","    __global const float* B,","    __global float* C) {","  int i = get_global_id(0);","  C[i] = A[i] + B[i];","}"],
  memory: ["__kernel void vec_add(","    __global const float* A,","    __global const float* B,","    __global float* C,","    __local float* scratch) {","  int gid = get_global_id(0);","  int lid = get_local_id(0);","  scratch[lid] = A[gid];","  barrier(CLK_LOCAL_MEM_FENCE);","  C[gid] = scratch[lid] + B[gid];","}"],
  host: ["cl_mem bufA = clCreateBuffer(ctx,","    CL_MEM_READ_ONLY, size, NULL, NULL);","cl_mem bufB = clCreateBuffer(ctx,","    CL_MEM_READ_ONLY, size, NULL, NULL);","cl_mem bufC = clCreateBuffer(ctx,","    CL_MEM_WRITE_ONLY, size, NULL, NULL);","clEnqueueWriteBuffer(queue, bufA,","    CL_TRUE, 0, size, hostA, 0, NULL, NULL);","clEnqueueWriteBuffer(queue, bufB,","    CL_TRUE, 0, size, hostB, 0, NULL, NULL);","clEnqueueNDRangeKernel(queue, kernel,","    1, NULL, &glob, &loc, 0, NULL, NULL);","clEnqueueReadBuffer(queue, bufC,","    CL_TRUE, 0, size, hostC, 0, NULL, NULL);"],
  hls: ["void vec_add(float A[N],","    float B[N], float C[N]) {","  #pragma HLS INTERFACE m_axi port=A","  #pragma HLS INTERFACE m_axi port=B","  #pragma HLS INTERFACE m_axi port=C","  for (int i = 0; i < N; i++) {","    #pragma HLS PIPELINE II=1","    C[i] = A[i] + B[i];","  }","}"],
};

function highlightC(line) {
  let h = line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  h = h.replace(/(#pragma\s+HLS\s+\w+)/g, `<span style="color:${C.amber}">$1</span>`);
  h = h.replace(/\b(__kernel|__global|__local|__constant|void|float|int|const|for|NULL|CL_\w+)\b/g, `<span style="color:${C.purple}">$1</span>`);
  h = h.replace(/\b(clGet\w+|clCreate\w+|clEnqueue\w+|get_global_id|get_local_id|get_group_id|barrier|CLK_LOCAL_MEM_FENCE)\b/g, `<span style="color:${C.blue}">$1</span>`);
  h = h.replace(/\b(\d+)\b/g, `<span style="color:${C.green}">$1</span>`);
  return h;
}

function CodePanel({ lines, highlightRows = [], title = "Code", mobile = false, collapsed = false, onToggle, fullWidth = false }) {
  return (
    <div style={{
      background: C.bgCode, borderRadius: 10, border: `1px solid ${C.border}`,
      overflow: "hidden", fontFamily: "'JetBrains Mono', monospace",
      ...(fullWidth || mobile ? { width: "100%" } : { width: 300, minWidth: 240, flexShrink: 0 })
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.bgCard }}>
        <span style={{ color: C.textDim, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>{title}</span>
        {mobile && onToggle && (
          <button onClick={onToggle} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "4px 8px" }}>
            {collapsed ? "Show ▼" : "Hide ▲"}
          </button>
        )}
      </div>
      {!collapsed && (
        <div style={{ padding: "6px 0", overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
          {lines.map((l, i) => {
            const hl = highlightRows.includes(i);
            return (
              <div key={i} style={{
                display: "flex", padding: "1px 10px 1px 0",
                background: hl ? `${C.blue}18` : "transparent",
                borderLeft: hl ? `3px solid ${C.blue}` : "3px solid transparent",
                transition: "background .2s, border-color .2s"
              }}>
                <span style={{ color: C.textDim, width: 28, textAlign: "right", marginRight: 8, fontSize: 11, lineHeight: "18px", userSelect: "none", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 11, lineHeight: "18px", color: C.text, whiteSpace: "pre" }} dangerouslySetInnerHTML={{ __html: highlightC(l) }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepControls({ step, maxStep, onPrev, onNext }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 0", fontFamily: "'DM Sans',sans-serif" }}>
      <button onClick={onPrev} disabled={step === 0} style={btnStyle(step === 0)}>← Prev</button>
      <span style={{ color: C.textDim, fontSize: 13, minWidth: 80, textAlign: "center" }}>Step {step + 1} / {maxStep + 1}</span>
      <button onClick={onNext} disabled={step === maxStep} style={btnStyle(step === maxStep)}>Next →</button>
    </div>
  );
}
function btnStyle(d) {
  return { background: d ? C.border : C.blue, color: d ? C.textDim : "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: d ? "default" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, minWidth: 44, minHeight: 44, opacity: d ? 0.5 : 1, transition: "background .15s, opacity .15s" };
}
function DescBox({ children }) {
  return (<div style={{ background: C.bgCard, borderRadius: 8, padding: "10px 14px", marginTop: 8, color: C.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, minHeight: 44, border: `1px solid ${C.border}` }} dangerouslySetInnerHTML={typeof children === "string" ? { __html: children } : undefined}>{typeof children !== "string" ? children : undefined}</div>);
}
function ArrowDefs() {
  return (<defs>
    {[["arrBlue",C.blue],["arrGreen",C.green],["arrAmber",C.amber],["arrPurple",C.purple],["arrCyan",C.cyan],["arrPink",C.pink]].map(([id,c]) => (
      <marker key={id} id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill={c}/></marker>
    ))}
    <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/></filter>
  </defs>);
}

// ======================== TAB 0: Platform ========================
const DEVICES = [
  { label: "GPU", icon: "⊞", desc: "Massively parallel cores", color: C.green, pe: "CUDA Core / Stream Proc." },
  { label: "FPGA", icon: "◈", desc: "Reconfigurable fabric (Kria)", color: C.amber, pe: "Datapath / Pipeline Stage" },
  { label: "CPU", icon: "▣", desc: "Multi-core processor", color: C.purple, pe: "ALU / SIMD Lane" },
];
const PLATFORM_STEPS = [
  { desc: "OpenCL defines a <b>Platform Model</b> — a host CPU connected to compute devices via a bus (PCIe for GPU, AXI for FPGA).", hl: [0,1], showCU: false, showPE: false, hlPE: false },
  { desc: "The host queries devices using <code>clGetDeviceIDs</code>. Like scanning for your Kria board, but device-agnostic.", hl: [2,3,4], showCU: false, showPE: false, hlPE: false },
  { desc: "A <b>Context</b> groups devices so they can share memory objects and command queues.", hl: [5,6], showCU: false, showPE: false, hlPE: false },
  { desc: "Each device has <b>Compute Units</b> (CUs). On GPU: streaming multiprocessors. On Kria: your replicated pipelines.", hl: [], showCU: true, showPE: false, hlPE: false },
  { desc: "Each CU has <b>Processing Elements</b> (PEs) — the smallest execution units that run your kernel code.", hl: [], showCU: true, showPE: true, hlPE: false },
  { desc: "<b>What is a PE?</b> On GPU: a CUDA core. On FPGA: one synthesized datapath. On CPU: an ALU / SIMD lane. Each PE executes one work-item.", hl: [], showCU: true, showPE: true, hlPE: true },
  { desc: "Key idea: the <b>same code</b> targets GPU, FPGA, or CPU. Toggle device type above — the hierarchy is identical. <b>Portability.</b>", hl: [], showCU: true, showPE: true, hlPE: false },
];

function PlatformTab({ mobile, step, onStep, maxStep }) {
  const [device, setDevice] = useState(0);
  const d = DEVICES[device];
  const s = PLATFORM_STEPS[step];
  // Mobile: stack vertically (host on top, device below). Desktop: side by side.
  const vw = mobile ? 360 : 620;
  const vh = mobile ? (s.showCU ? 420 : 220) : (s.hlPE ? 320 : 280);
  // Host position
  const hx = mobile ? 90 : 30, hy = mobile ? 20 : 70, hw = mobile ? 180 : 140, hh = mobile ? 70 : 90;
  // Device position
  const dx = mobile ? 40 : 360, dy = mobile ? (hh + 60) : 30;
  const dw = mobile ? 280 : 230, dh = mobile ? (s.showCU ? 250 : 90) : (s.hlPE ? 260 : 230);
  // Arrow: vertical on mobile, horizontal on desktop
  const arrX1 = mobile ? hx + hw / 2 : hx + hw;
  const arrY1 = mobile ? hy + hh : hy + hh / 2;
  const arrX2 = mobile ? dx + dw / 2 : dx;
  const arrY2 = mobile ? dy : dy + dh / 2;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
        {DEVICES.map((dv, i) => (
          <button key={i} onClick={() => setDevice(i)} style={{
            background: device === i ? dv.color + "15" : C.bgCard,
            border: `2px solid ${device === i ? dv.color : C.border}`,
            color: device === i ? dv.color : C.textDim, borderRadius: 8,
            padding: "8px 16px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            fontSize: 13, fontWeight: 600, minHeight: 44, transition: "all .15s"
          }}>{dv.icon} {dv.label}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width: "100%", maxWidth: vw, display: "block", margin: "0 auto" }}>
        <ArrowDefs />
        {/* Host */}
        <rect x={hx} y={hy} width={hw} height={hh} rx={10} fill={C.bgCard} stroke={C.purple} strokeWidth={2} filter="url(#shadow)" />
        <text x={hx+hw/2} y={hy + (mobile ? 22 : 28)} textAnchor="middle" fill={C.purple} fontSize={mobile ? 12 : 13} fontWeight="700" fontFamily="'DM Sans',sans-serif">HOST (CPU)</text>
        <text x={hx+hw/2} y={hy + (mobile ? 38 : 46)} textAnchor="middle" fill={C.textDim} fontSize={mobile ? 9 : 10} fontFamily="'DM Sans',sans-serif">Your application</text>
        {!mobile && <text x={hx+hw/2} y={hy+62} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'JetBrains Mono',monospace">cmd queue</text>}
        {/* Arrow host→device */}
        <line x1={arrX1} y1={arrY1} x2={arrX2} y2={arrY2} stroke={C.blue} strokeWidth={2} markerEnd="url(#arrBlue)" strokeDasharray={s.showCU ? "none" : "6 3"} />
        <text x={(arrX1+arrX2)/2 + (mobile ? 30 : 0)} y={(arrY1+arrY2)/2 - 6} textAnchor="middle" fill={C.textDim} fontSize={8} fontFamily="'DM Sans',sans-serif">PCIe / AXI</text>
        {/* Device */}
        <rect x={dx} y={dy} width={dw} height={dh} rx={10} fill={C.bgCard} stroke={d.color} strokeWidth={2} filter="url(#shadow)" style={{ transition: "stroke .3s" }} />
        <text x={dx+dw/2} y={dy+18} textAnchor="middle" fill={d.color} fontSize={mobile ? 11 : 12} fontWeight="700" fontFamily="'DM Sans',sans-serif">{d.icon} DEVICE ({d.label})</text>
        <text x={dx+dw/2} y={dy+32} textAnchor="middle" fill={C.textDim} fontSize={8} fontFamily="'DM Sans',sans-serif">{d.desc}</text>
        {/* CUs */}
        {s.showCU && [0,1].map(r => [0,1].map(c => {
          const cuW = mobile ? 120 : 95, cuH = 60;
          const cuGapX = mobile ? 10 : 8, cuGapY = 8;
          const bx = dx + 10 + c * (cuW + cuGapX);
          const by = dy + 42 + r * (cuH + cuGapY);
          return (
            <g key={`${r}${c}`}>
              <rect x={bx} y={by} width={cuW} height={cuH} rx={6} fill={C.bgCode} stroke={C.border} strokeWidth={1.5} />
              <text x={bx+cuW/2} y={by+14} textAnchor="middle" fill={C.textDim} fontSize={9} fontWeight="600" fontFamily="'DM Sans',sans-serif">CU {r*2+c}</text>
              {s.showPE && [0,1,2].map(p => {
                const peW = mobile ? 30 : 24, peH = mobile ? 32 : 30;
                const peGap = mobile ? 6 : 4;
                const peStartX = bx + (cuW - 3*peW - 2*peGap) / 2;
                const px = peStartX + p * (peW + peGap), py = by + 20;
                const isHL = s.hlPE && p === 0 && r === 0 && c === 0;
                return (
                  <g key={p}>
                    <rect x={px} y={py} width={peW} height={peH} rx={4}
                      fill={isHL ? d.color+"44" : d.color+"22"} stroke={isHL ? d.color : d.color+"88"} strokeWidth={isHL ? 2 : 1} />
                    <text x={px+peW/2} y={py+14} textAnchor="middle" fill={isHL ? d.color : C.textDim} fontSize={8} fontWeight="600" fontFamily="'DM Sans',sans-serif">PE</text>
                    <text x={px+peW/2} y={py+24} textAnchor="middle" fill={isHL ? d.color : C.textDim} fontSize={7} fontFamily="'JetBrains Mono',monospace">{p}</text>
                  </g>
                );
              })}
              {!s.showPE && [0,1,2].map(p => {
                const peW = mobile ? 30 : 24, peGap = mobile ? 6 : 4;
                const peStartX = bx + (cuW - 3*peW - 2*peGap) / 2;
                return <rect key={p} x={peStartX+p*(peW+peGap)} y={by+20} width={peW} height={30} rx={4} fill={d.color+"15"} stroke={d.color+"44"} strokeWidth={0.5} />;
              })}
            </g>
          );
        }))}
        {/* PE callout */}
        {s.hlPE && (() => {
          const calloutY = dy + dh + 4;
          return (
            <g>
              <rect x={dx} y={calloutY} width={dw} height={22} rx={4} fill={d.color+"18"} stroke={d.color} strokeWidth={1} />
              <text x={dx+dw/2} y={calloutY+15} textAnchor="middle" fill={d.color} fontSize={9} fontWeight="600" fontFamily="'DM Sans',sans-serif">PE = {d.pe}</text>
            </g>
          );
        })()}
      </svg>
      <DescBox>{s.desc}</DescBox>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p-1)} onNext={() => onStep(p => p+1)} />
    </div>
  );
}

// ======================== TAB 1: Memory ========================
const MEM_STEPS = [
  { desc: "OpenCL defines a <b>Memory Model</b> with four device regions plus host memory. On your FPGA, you managed BRAM vs DDR manually — OpenCL standardizes these.", hl: [], show: 0 },
  { desc: "<b>Host Memory</b> — CPU RAM where your application data lives. On Kria: PS-side DDR.", hl: [], show: 1 },
  { desc: "<b>Global Memory</b> — device RAM accessible by <i>all</i> work-items. Largest but slowest. FPGA: PL DDR via AXI.", hl: [0,1,2,3], show: 2 },
  { desc: "<b>Constant Memory</b> — read-only cached global memory. FPGA: ROM or constant LUTs.", hl: [1,2], show: 3 },
  { desc: "<b>Local Memory</b> — shared scratchpad within a work-group, very fast. FPGA: BRAM per CU.", hl: [4,7,8], show: 4 },
  { desc: "<b>Private Memory</b> — per work-item registers. FPGA: flip-flops. Fastest, smallest.", hl: [5,6,9,10], show: 5 },
  { desc: "Data flows: Host → Global → Local → Private, then results return. On FPGA you'd wire DMA + AXI + BRAM manually.", hl: [], show: 6 },
];

function MemoryTab({ mobile, step, onStep, maxStep }) {
  const s = MEM_STEPS[step];
  const show = s.show;
  // Use a taller viewBox with more generous spacing
  const vw = mobile ? 340 : 620;
  const vh = mobile ? 440 : 340;
  // Host region (left on desktop, top on mobile)
  const hX = 10, hY = 10;
  const hW = mobile ? 100 : 140;
  const hH = mobile ? 130 : vh - 20;
  // Device region
  const dX = mobile ? 120 : hW + 50;
  const dY = mobile ? 10 : 10;
  const dW = vw - dX - 10;
  const dH = mobile ? 420 : vh - 20;
  // Global inside device
  const gX = dX + 8, gY = dY + 28, gW = dW - 16, gH = dH - 36;
  // Constant inside global (left column)
  const cX = gX + 6, cY = gY + 22;
  const cW = mobile ? 80 : 110;
  const cH = mobile ? 80 : gH - 50;
  // CU inside global (right column)
  const cuX = cX + cW + (mobile ? 8 : 12);
  const cuY = gY + 22;
  const cuW = gW - cW - (mobile ? 20 : 24);
  const cuH = mobile ? gH - 30 : gH - 50;
  // Local inside CU
  const lX = cuX + 6, lY = cuY + 20;
  const lW = cuW - 12;
  const lH = mobile ? 44 : 42;
  // Private inside CU (below local)
  const pY = lY + lH + 15;
  const pW = mobile ? 36 : 44;
  const pH = mobile ? 55 : Math.min(cuH - lH - 50, 75);
  const pGap = mobile ? 6 : 8;
  const pStartX = lX + (lW - 3 * pW - 2 * pGap) / 2;
  // Arrow midpoint
  const arrMidX = mobile ? (hX + hW + dX) / 2 : hX + hW + 25;

  function rBox(x, y, w, h, color, label, sub, vis, dash) {
    return (
      <g style={{ opacity: vis ? 1 : 0.12, transition: "opacity .4s" }}>
        <rect x={x} y={y} width={w} height={h} rx={8} fill={color+"0c"} stroke={color} strokeWidth={vis ? 2 : 1} strokeDasharray={dash ? "5 3" : "none"} />
        <text x={x+6} y={y+13} fill={color} fontSize={mobile ? 8 : 10} fontWeight="700" fontFamily="'DM Sans',sans-serif">{label}</text>
        {sub && <text x={x+6} y={y+23} fill={C.textDim} fontSize={mobile ? 6 : 8} fontFamily="'DM Sans',sans-serif">{sub}</text>}
      </g>
    );
  }

  return (
    <div>
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width: "100%", maxWidth: vw, display: "block", margin: "0 auto" }}>
        <ArrowDefs />
        {/* Host */}
        {rBox(hX, hY, hW, hH, C.purple, "HOST MEM", "CPU RAM", show >= 1, false)}
        {show >= 1 && ["hostA[]","hostB[]","hostC[]"].map((b,i) => (
          <g key={i}>
            <rect x={hX+8} y={hY+30+i*26} width={hW-16} height={20} rx={4} fill={C.purple+"18"} stroke={C.purple+"55"} strokeWidth={1} />
            <text x={hX+hW/2} y={hY+44+i*26} textAnchor="middle" fill={C.purple} fontSize={8} fontFamily="'JetBrains Mono',monospace">{b}</text>
          </g>
        ))}
        {show >= 1 && <text x={hX+hW/2} y={hY+hH-6} textAnchor="middle" fill={C.textDim} fontSize={6} fontFamily="'DM Sans',sans-serif">FPGA: PS DDR</text>}

        {/* Device container */}
        <rect x={dX} y={dY} width={dW} height={dH} rx={10} fill={C.bgCard} stroke={C.green} strokeWidth={show>=2?2:1} style={{ opacity: show>=2?1:0.12, transition: "all .4s" }} />
        <text x={dX+dW/2} y={dY+16} textAnchor="middle" fill={C.green} fontSize={mobile?9:11} fontWeight="700" fontFamily="'DM Sans',sans-serif" style={{ opacity: show>=2?1:0.12 }}>DEVICE</text>

        {/* Global */}
        {rBox(gX, gY, gW, gH, C.green, "GLOBAL MEMORY", mobile ? "All work-items" : "All work-items can access", show >= 2, false)}
        {show >= 2 && <text x={gX+6} y={gY+gH-6} fill={C.textDim} fontSize={6} fontFamily="'DM Sans',sans-serif">FPGA: PL DDR via AXI</text>}

        {/* Constant */}
        {rBox(cX, cY, cW, cH, C.cyan, "CONSTANT", "Read-only", show >= 3, true)}
        {show >= 3 && (
          <g>
            <rect x={cX+6} y={cY+30} width={cW-12} height={16} rx={3} fill={C.cyan+"18"} stroke={C.cyan+"44"} strokeWidth={1} />
            <text x={cX+cW/2} y={cY+42} textAnchor="middle" fill={C.cyan} fontSize={7} fontFamily="'JetBrains Mono',monospace">coefficients</text>
            <text x={cX+cW/2} y={cY+cH-6} textAnchor="middle" fill={C.textDim} fontSize={6} fontFamily="'DM Sans',sans-serif">FPGA: ROM/LUT</text>
          </g>
        )}

        {/* CU */}
        {rBox(cuX, cuY, cuW, cuH, C.border, "CU 0", null, show >= 4, false)}
        {/* Local inside CU */}
        {rBox(lX, lY, lW, lH, C.amber, "LOCAL MEM", "Work-group shared", show >= 4, false)}
        {show >= 4 && (
          <g>
            <rect x={lX+lW-56} y={lY+6} width={50} height={14} rx={3} fill={C.amber+"18"} stroke={C.amber+"44"} strokeWidth={1} />
            <text x={lX+lW-31} y={lY+17} textAnchor="middle" fill={C.amber} fontSize={7} fontFamily="'JetBrains Mono',monospace">scratch[]</text>
            <text x={lX+6} y={lY+lH-4} fill={C.textDim} fontSize={6} fontFamily="'DM Sans',sans-serif">FPGA: BRAM</text>
          </g>
        )}
        {/* Private */}
        {show >= 5 && [0,1,2].map(i => {
          const px = pStartX + i * (pW + pGap);
          return (
            <g key={i}>
              <rect x={px} y={pY} width={pW} height={pH} rx={4} fill={C.pink+"0c"} stroke={C.pink} strokeWidth={1.5} />
              <text x={px+pW/2} y={pY+12} textAnchor="middle" fill={C.pink} fontSize={7} fontWeight="700" fontFamily="'DM Sans',sans-serif">PRIVATE</text>
              <text x={px+pW/2} y={pY+24} textAnchor="middle" fill={C.textDim} fontSize={7} fontFamily="'JetBrains Mono',monospace">WI {i}</text>
              <text x={px+pW/2} y={pY+pH-4} textAnchor="middle" fill={C.textDim} fontSize={5} fontFamily="'DM Sans',sans-serif">{mobile?"FFs":"Registers"}</text>
            </g>
          );
        })}
        {/* Data flow arrows */}
        {show >= 6 && (
          <g>
            <line x1={hX+hW} y1={hY+40} x2={gX} y2={gY+16} stroke={C.purple} strokeWidth={2} markerEnd="url(#arrPurple)" />
            <text x={arrMidX} y={hY+30} textAnchor="middle" fill={C.purple} fontSize={7} fontWeight="600" fontFamily="'DM Sans',sans-serif">WriteBuffer</text>
            <path d={`M${gX+gW*0.6},${gY+gH-20} L${lX+lW/2},${lY}`} stroke={C.amber} strokeWidth={1.5} markerEnd="url(#arrAmber)" strokeDasharray="4 2" />
            <path d={`M${lX+lW/2},${lY+lH} L${pStartX+pW/2},${pY}`} stroke={C.pink} strokeWidth={1.5} markerEnd="url(#arrPink)" strokeDasharray="4 2" />
            <line x1={gX} y1={gY+gH-8} x2={hX+hW} y2={hY+hH-10} stroke={C.cyan} strokeWidth={2} markerEnd="url(#arrCyan)" />
            <text x={arrMidX} y={hY+hH} textAnchor="middle" fill={C.cyan} fontSize={7} fontWeight="600" fontFamily="'DM Sans',sans-serif">ReadBuffer</text>
          </g>
        )}
      </svg>
      <DescBox>{s.desc}</DescBox>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p-1)} onNext={() => onStep(p => p+1)} />
    </div>
  );
}

// ======================== TAB 2: NDRange ========================
const WG_OPTIONS = [[2,2],[4,2],[4,4],[8,4]];
const ND_STEPS = [
  { desc: "This is the <b>NDRange</b> — the global work-space. Each cell is one <b>work-item</b>.", showGroups: false, hlGroup: -1, hlCell: false },
  { desc: "The runtime divides work into <b>work-groups</b>. Each group runs on one Compute Unit.", showGroups: true, hlGroup: -1, hlCell: false },
  { desc: "Colored regions show distinct work-groups — each is a unit of scheduling.", showGroups: true, hlGroup: 0, hlCell: false },
  { desc: "Inside a work-group, each work-item has a <b>local ID</b>. Click any cell to see its IDs.", showGroups: true, hlGroup: 0, hlCell: true },
  { desc: "<code>get_global_id(0)</code> = column; <code>get_local_id</code> = position within group.", showGroups: true, hlGroup: -1, hlCell: true },
];

function NDRangeTab({ mobile, step, onStep, maxStep }) {
  const [wgIdx, setWgIdx] = useState(1);
  const [selCell, setSelCell] = useState(null);
  const cols = mobile ? 8 : 16, rows = mobile ? 4 : 8;
  const wgW = WG_OPTIONS[wgIdx][0], wgH = WG_OPTIONS[wgIdx][1];
  const cellSize = mobile ? 40 : 32;
  const s = ND_STEPS[step];
  const getGI = (x, y) => Math.floor(y/wgH) * Math.ceil(cols/wgW) + Math.floor(x/wgW);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, fontFamily: "'DM Sans',sans-serif", flexWrap: "wrap" }}>
        <span style={{ color: C.textDim, fontSize: 13 }}>Work-group size:</span>
        <input type="range" min={0} max={WG_OPTIONS.length-1} value={wgIdx} onChange={e => { setWgIdx(+e.target.value); setSelCell(null); }} style={{ width: 120, accentColor: C.blue }} />
        <span style={{ color: C.blue, fontSize: 14, fontWeight: 600, minWidth: 50 }}>{wgW}×{wgH}</span>
      </div>
      <div style={{ overflowX: "auto", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap: 2, padding: 4 }}>
          {Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
            const gi = getGI(x, y), isSel = selCell?.x === x && selCell?.y === y;
            const isHl = s.hlGroup >= 0 && gi === s.hlGroup, ok = s.hlCell || s.showGroups;
            return (<div key={`${x}-${y}`} onClick={() => ok && setSelCell({ x, y })} style={{
              width: cellSize, height: cellSize, borderRadius: 4,
              background: s.showGroups ? C.wg[gi%C.wg.length] : C.bgCard,
              border: isSel ? `2px solid ${C.blue}` : (isHl ? `2px solid ${C.wgBorder[gi%C.wgBorder.length]}` : `1px solid ${C.border}`),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, color: C.textDim, cursor: ok ? "pointer" : "default",
              transition: "background .2s, border .2s", fontFamily: "'JetBrains Mono',monospace"
            }}>{cellSize >= 30 ? `${x},${y}` : ""}</div>);
          }))}
        </div>
      </div>
      {selCell && s.showGroups && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", marginTop: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <span>global_id: <b style={{ color: C.blue }}>({selCell.x}, {selCell.y})</b></span>
          <span>local_id: <b style={{ color: C.green }}>({selCell.x%wgW}, {selCell.y%wgH})</b></span>
          <span>group_id: <b style={{ color: C.amber }}>({Math.floor(selCell.x/wgW)}, {Math.floor(selCell.y/wgH)})</b></span>
        </div>
      )}
      <DescBox>{s.desc}</DescBox>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p-1)} onNext={() => onStep(p => p+1)} />
    </div>
  );
}

// ======================== TAB 3: Timeline ========================
const TL_PHASES = [
  { label: "CreateBuffer", fullLabel: "clCreateBuffer", color: C.purple },
  { label: "WriteBuffer", fullLabel: "clEnqueueWriteBuffer", color: C.amber },
  { label: "NDRangeKernel", fullLabel: "clEnqueueNDRangeKernel", color: C.green },
  { label: "ReadBuffer", fullLabel: "clEnqueueReadBuffer", color: C.cyan },
];
const TL_STEPS = [
  { phase: -1, desc: "The host orchestrates execution through a <b>command queue</b>. The diagram shows host ↔ device data flow." },
  { phase: 0, desc: "Allocate memory buffers on the device — analogous to BRAM or DDR interfaces on FPGA." },
  { phase: 1, desc: "Transfer input data from host to device. Data blocks move across the bus — like DMA writes on Kria." },
  { phase: 2, desc: "Launch the kernel! Work-groups execute on CUs in parallel. More CUs = faster." },
  { phase: 3, desc: "Read results back from device to host — the DMA read-back step." },
  { phase: 4, desc: "Done! allocate → write → execute → read. On FPGA you wired each step; OpenCL automates it." },
];

function TimelineTab({ mobile, step, onStep, maxStep }) {
  const [cus, setCus] = useState(4);
  const s = TL_STEPS[step];
  const fw = mobile ? 320 : 500, fh = 80;
  const hBW = mobile ? 70 : 100, dBW = mobile ? 100 : 150;
  const hBX = 10, dBX = fw - dBW - 10;
  // Gantt
  const barH = mobile ? 18 : 22, barGap = 3;
  const lm = mobile ? 90 : 170, tw = mobile ? 320 : 500, bmw = tw - lm - 10;

  const blocks = { [-1]:[], 0:[], 1:[{x:hBX+hBW+16,l:"A[]",c:C.amber},{x:(hBX+hBW+dBX)/2+4,l:"B[]",c:C.amber}], 2:[{x:dBX+16,l:"⚡",c:C.green}], 3:[{x:(hBX+hBW+dBX)/2+4,l:"C[]",c:C.cyan}], 4:[] }[s.phase] || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, fontFamily: "'DM Sans',sans-serif", flexWrap: "wrap" }}>
        <span style={{ color: C.textDim, fontSize: 13 }}>Compute Units:</span>
        <input type="range" min={1} max={8} value={cus} onChange={e => setCus(+e.target.value)} style={{ width: 120, accentColor: C.green }} />
        <span style={{ color: C.green, fontSize: 14, fontWeight: 600, minWidth: 20 }}>{cus}</span>
      </div>
      {/* Data flow diagram */}
      <svg viewBox={`0 0 ${fw} ${fh}`} style={{ width: "100%", maxWidth: fw, display: "block", margin: "0 auto 6px" }}>
        <ArrowDefs />
        <rect x={hBX} y={8} width={hBW} height={fh-16} rx={8} fill={C.bgCard} stroke={C.purple} strokeWidth={2} />
        <text x={hBX+hBW/2} y={26} textAnchor="middle" fill={C.purple} fontSize={mobile?9:10} fontWeight="700" fontFamily="'DM Sans',sans-serif">HOST</text>
        <text x={hBX+hBW/2} y={40} textAnchor="middle" fill={C.textDim} fontSize={7} fontFamily="'JetBrains Mono',monospace">hostA,B,C</text>
        <rect x={dBX} y={8} width={dBW} height={fh-16} rx={8} fill={C.bgCard} stroke={C.green} strokeWidth={2} />
        <text x={dBX+dBW/2} y={26} textAnchor="middle" fill={C.green} fontSize={mobile?9:10} fontWeight="700" fontFamily="'DM Sans',sans-serif">DEVICE</text>
        <text x={dBX+dBW/2} y={40} textAnchor="middle" fill={C.textDim} fontSize={7} fontFamily="'JetBrains Mono',monospace">bufA,B,C</text>
        <line x1={hBX+hBW} y1={fh/2} x2={dBX} y2={fh/2} stroke={C.border} strokeWidth={3} strokeLinecap="round" />
        <text x={(hBX+hBW+dBX)/2} y={18} textAnchor="middle" fill={C.textDim} fontSize={7} fontFamily="'DM Sans',sans-serif">PCIe / AXI Bus</text>
        {s.phase===1 && <line x1={hBX+hBW+4} y1={fh/2} x2={dBX-4} y2={fh/2} stroke={C.amber} strokeWidth={2} markerEnd="url(#arrAmber)" />}
        {s.phase===3 && <line x1={dBX-4} y1={fh/2} x2={hBX+hBW+4} y2={fh/2} stroke={C.cyan} strokeWidth={2} markerEnd="url(#arrCyan)" />}
        {blocks.map((b,i) => (
          <g key={i}>
            <rect x={b.x} y={fh/2-8} width={22} height={16} rx={4} fill={b.c+"44"} stroke={b.c} strokeWidth={1.5}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
            </rect>
            <text x={b.x+11} y={fh/2+4} textAnchor="middle" fill={b.c} fontSize={7} fontWeight="700" fontFamily="'JetBrains Mono',monospace">{b.l}</text>
          </g>
        ))}
        {s.phase===2 && (
          <g>
            <rect x={dBX+4} y={fh-18} width={dBW-8} height={10} rx={3} fill={C.green+"33"} stroke={C.green} strokeWidth={1}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </rect>
            <text x={dBX+dBW/2} y={fh-10} textAnchor="middle" fill={C.green} fontSize={6} fontWeight="600" fontFamily="'DM Sans',sans-serif">Kernel running</text>
          </g>
        )}
      </svg>
      {/* Gantt */}
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${tw} ${barH*5+barGap*6+16+(s.phase>=2?(cus-1)*(barH*0.55+2):0)}`} style={{ width: "100%", maxWidth: tw, display: "block", margin: "0 auto" }}>
          {(() => {
            let els = [], yo = 0;
            for (let i = 0; i < 4; i++) {
              const ph = TL_PHASES[i], act = s.phase >= i, cur = s.phase === i;
              const y = 4 + i*(barH+barGap) + yo;
              const label = mobile ? ph.label : ph.fullLabel;
              if (i===2 && s.phase>=2) {
                const sh = barH*0.55, bw = act ? bmw/(cus<=2?1:Math.log2(cus)+1)*(cus<=2?0.8:1) : 0;
                els.push(<g key={i}>
                  <text x={lm-6} y={y+sh/2+4} textAnchor="end" fill={cur?ph.color:C.textDim} fontSize={mobile?7:10} fontFamily="'JetBrains Mono',monospace" fontWeight={cur?700:400}>{label}</text>
                  {Array.from({length:cus},(_,c) => <rect key={c} x={lm} y={y+c*(sh+2)} width={bw} height={sh} rx={3} fill={ph.color+(cur?"bb":"55")} stroke={cur?ph.color:"none"} strokeWidth={1} style={{transition:"width .4s ease-out"}}/>)}
                  {cur && <text x={lm+4} y={y+cus*(sh+2)+9} fill={C.textDim} fontSize={7} fontFamily="'DM Sans',sans-serif">{cus} CU{cus>1?"s":""} parallel</text>}
                </g>);
                yo += (cus-1)*(sh+2);
              } else {
                const bw = act ? bmw*(i===0?0.3:0.5) : 0;
                els.push(<g key={i}>
                  <text x={lm-6} y={y+barH/2+4} textAnchor="end" fill={cur?ph.color:C.textDim} fontSize={mobile?7:10} fontFamily="'JetBrains Mono',monospace" fontWeight={cur?700:400}>{label}</text>
                  <rect x={lm} y={y} width={bw} height={barH} rx={3} fill={ph.color+(cur?"bb":"55")} stroke={cur?ph.color:"none"} strokeWidth={1} style={{transition:"width .4s ease-out"}}/>
                </g>);
              }
            }
            return els;
          })()}
        </svg>
      </div>
      <DescBox>{s.desc}</DescBox>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p-1)} onNext={() => onStep(p => p+1)} />
    </div>
  );
}

// ======================== TAB 4: Comparison ========================
const CMP_STEPS = [
  { desc: "<b>Define the computation:</b> OpenCL kernel vs HLS C function.", oclHl: [0,1,2,3,4,5,6], hlsHl: [0,1,7,8,9] },
  { desc: "<b>Interfaces:</b> OpenCL uses <code>__global</code> pointers; HLS uses <code>#pragma</code> for AXI.", oclHl: [1,2,3], hlsHl: [2,3,4] },
  { desc: "<b>Parallelism:</b> OpenCL launches work-items via <code>get_global_id</code>; HLS pipelines a loop.", oclHl: [4,5], hlsHl: [5,6,7] },
  { desc: "<b>Deployment:</b> OpenCL compiles at runtime. HLS synthesizes a bitstream for one FPGA.", oclHl: [], hlsHl: [] },
  { desc: "<b>Trade-off:</b> OpenCL = portable. FPGA/HLS = fine-grained timing/resource/IO control.", oclHl: [], hlsHl: [] },
];

function ComparisonTab({ mobile, step, onStep, maxStep }) {
  const s = CMP_STEPS[step];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        <CodePanel lines={CODE.kernel} highlightRows={s.oclHl} title="OpenCL Kernel" mobile={mobile} fullWidth />
        <CodePanel lines={CODE.hls} highlightRows={s.hlsHl} title="HLS (FPGA)" mobile={mobile} fullWidth />
      </div>
      <DescBox>{s.desc}</DescBox>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p-1)} onNext={() => onStep(p => p+1)} />
    </div>
  );
}

// ======================== Main ========================
const TABS = [
  { label: "Platform", short: "Plat", icon: "◉" },
  { label: "Memory", short: "Mem", icon: "▦" },
  { label: "NDRange", short: "NDR", icon: "⊞" },
  { label: "Timeline", short: "Time", icon: "▶" },
  { label: "Comparison", short: "Cmp", icon: "⇄" },
];
const MAX_STEPS = [PLATFORM_STEPS.length-1, MEM_STEPS.length-1, ND_STEPS.length-1, TL_STEPS.length-1, CMP_STEPS.length-1];

export default function OpenCLDemo() {
  const [tab, setTab] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [codeCollapsed, setCodeCollapsed] = useState(false);
  const [steps, setSteps] = useState([0,0,0,0,0]);
  const setCurrentStep = useCallback((s) => {
    setSteps(prev => { const n=[...prev]; n[tab]=typeof s==="function"?s(prev[tab]):s; return n; });
  }, [tab]);
  const currentStep = steps[tab];

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset step to 0 when switching tabs
  useEffect(() => {
    setCurrentStep(0);
  }, [tab]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key==="ArrowLeft") { e.preventDefault(); setCurrentStep(p => Math.max(0, p-1)); }
      else if (e.key==="ArrowRight") { e.preventDefault(); setCurrentStep(p => Math.min(MAX_STEPS[tab], p+1)); }
      else if (e.key==="Home") { e.preventDefault(); setCurrentStep(0); }
      else if (e.key==="End") { e.preventDefault(); setCurrentStep(MAX_STEPS[tab]); }
      else if (e.key>="1" && e.key<="5") { setTab(+e.key-1); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, setCurrentStep]);

  const getCodeInfo = () => {
    if (tab===0) return { lines: CODE.platform, title: "Host Setup", hl: PLATFORM_STEPS[currentStep]?.hl||[] };
    if (tab===1) return { lines: CODE.memory, title: "Memory Kernel", hl: MEM_STEPS[currentStep]?.hl||[] };
    if (tab===2) { const h=[[0,1,2,3],[0,1,2,3],[0,1,2,3],[4],[4,5]]; return { lines: CODE.kernel, title: "Kernel", hl: h[currentStep]||[] }; }
    if (tab===3) { const p=TL_STEPS[currentStep]?.phase??-1; const m={[-1]:[],0:[0,1,2,3,4,5],1:[6,7,8,9],2:[10,11],3:[12,13],4:Array.from({length:14},(_,i)=>i)}; return { lines: CODE.host, title: "Host Code", hl: m[p]||[] }; }
    return null;
  };
  const codeInfo = getCodeInfo();

  const tabEl = (() => {
    const p = { mobile, step: currentStep, onStep: setCurrentStep };
    switch(tab) {
      case 0: return <PlatformTab {...p} maxStep={MAX_STEPS[0]} />;
      case 1: return <MemoryTab {...p} maxStep={MAX_STEPS[1]} />;
      case 2: return <NDRangeTab {...p} maxStep={MAX_STEPS[2]} />;
      case 3: return <TimelineTab {...p} maxStep={MAX_STEPS[3]} />;
      case 4: return <ComparisonTab {...p} maxStep={MAX_STEPS[4]} />;
      default: return null;
    }
  })();

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'DM Sans',sans-serif", padding: mobile?"10px 6px":"20px 24px" }}>
      <link href={FONTS_URL} rel="stylesheet" />
      <style>{`*,*::before,*::after{box-sizing:border-box}body{margin:0;background:${C.bg}}button:focus-visible{outline:2px solid ${C.blue};outline-offset:2px}input[type=range]{height:6px}input[type=range]::-webkit-slider-thumb{width:22px;height:22px}@media(max-width:767px){input[type=range]::-webkit-slider-thumb{width:28px;height:28px}}`}</style>
      <div style={{ textAlign: "center", marginBottom: mobile?10:16 }}>
        <h1 style={{ fontSize: mobile?20:26, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>
          OpenCL <span style={{ color: C.blue }}>Interactive</span> Demo
        </h1>
        <p style={{ color: C.textDim, fontSize: mobile?11:13, margin: 0 }}>From FPGA to portable parallel computing · ← → step · 1-5 tabs</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: mobile?10:16, overflowX: "auto", padding: "0 4px" }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: tab===i?C.blue+"22":"transparent", border: "none",
            borderBottom: tab===i?`3px solid ${C.blue}`:"3px solid transparent",
            color: tab===i?C.blue:C.textDim, padding: mobile?"10px 10px":"10px 16px",
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            fontSize: mobile?11:13, fontWeight: tab===i?700:500,
            borderRadius: "8px 8px 0 0", transition: "all .15s", whiteSpace: "nowrap", minHeight: 44
          }}><span style={{ marginRight: 4 }}>{t.icon}</span>{mobile?t.short:t.label}</button>
        ))}
      </div>
      {tab===4 ? tabEl : (
        <div style={{ display: mobile?"block":"flex", gap: 16, alignItems: "flex-start" }}>
          {codeInfo && <CodePanel lines={codeInfo.lines} highlightRows={codeInfo.hl} title={codeInfo.title} mobile={mobile} collapsed={mobile&&codeCollapsed} onToggle={() => setCodeCollapsed(c => !c)} />}
          <div style={{ flex: 1, minWidth: 0, marginTop: mobile?10:0 }}>{tabEl}</div>
        </div>
      )}
    </div>
  );
}
