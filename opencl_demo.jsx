import { useState, useEffect, useCallback } from "react";

const FONTS_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

// --- Color tokens ---
const C = {
  bg: "#0f1117", bgCard: "#1a1d27", bgCode: "#141620",
  text: "#e8eaf0", textDim: "#8b90a0", border: "#2a2d3a",
  blue: "#4a9eff", green: "#34d399", amber: "#f59e0b",
  purple: "#a78bfa", red: "#f87171", cyan: "#22d3ee",
  wg: ["#4a9eff33","#34d39933","#f59e0b33","#a78bfa33","#f8717133","#22d3ee33"],
  wgBorder: ["#4a9eff","#34d399","#f59e0b","#a78bfa","#f87171","#22d3ee"],
};

// --- Code snippets (no blank lines) ---
const CODE = {
  platform: [
    "cl_platform_id platform;",
    "clGetPlatformIDs(1, &platform, NULL);",
    "cl_device_id device;",
    "clGetDeviceIDs(platform,",
    "    CL_DEVICE_TYPE_GPU, 1, &device, NULL);",
    "cl_context ctx = clCreateContext(",
    "    NULL, 1, &device, NULL, NULL, NULL);",
  ],
  kernel: [
    "__kernel void vec_add(",
    "    __global const float* A,",
    "    __global const float* B,",
    "    __global float* C) {",
    "  int i = get_global_id(0);",
    "  C[i] = A[i] + B[i];",
    "}",
  ],
  host: [
    "cl_mem bufA = clCreateBuffer(ctx,",
    "    CL_MEM_READ_ONLY, size, NULL, NULL);",
    "cl_mem bufB = clCreateBuffer(ctx,",
    "    CL_MEM_READ_ONLY, size, NULL, NULL);",
    "cl_mem bufC = clCreateBuffer(ctx,",
    "    CL_MEM_WRITE_ONLY, size, NULL, NULL);",
    "clEnqueueWriteBuffer(queue, bufA,",
    "    CL_TRUE, 0, size, hostA, 0, NULL, NULL);",
    "clEnqueueWriteBuffer(queue, bufB,",
    "    CL_TRUE, 0, size, hostB, 0, NULL, NULL);",
    "clEnqueueNDRangeKernel(queue, kernel,",
    "    1, NULL, &glob, &loc, 0, NULL, NULL);",
    "clEnqueueReadBuffer(queue, bufC,",
    "    CL_TRUE, 0, size, hostC, 0, NULL, NULL);",
  ],
  hls: [
    "void vec_add(float A[N],",
    "    float B[N], float C[N]) {",
    "  #pragma HLS INTERFACE m_axi port=A",
    "  #pragma HLS INTERFACE m_axi port=B",
    "  #pragma HLS INTERFACE m_axi port=C",
    "  for (int i = 0; i < N; i++) {",
    "    #pragma HLS PIPELINE II=1",
    "    C[i] = A[i] + B[i];",
    "  }",
    "}",
  ],
};

// --- Syntax highlighting (minimal) ---
function highlightC(line) {
  const kw = /\b(__kernel|__global|void|float|int|const|for|NULL|CL_\w+)\b/g;
  const fn = /\b(clGet\w+|clCreate\w+|clEnqueue\w+|get_global_id|get_local_id|get_group_id)\b/g;
  const pragma = /(#pragma\s+HLS\s+\w+)/g;
  const num = /\b(\d+)\b/g;
  let html = line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  html = html.replace(pragma, `<span style="color:${C.amber}">$1</span>`);
  html = html.replace(kw, `<span style="color:${C.purple}">$1</span>`);
  html = html.replace(fn, `<span style="color:${C.blue}">$1</span>`);
  html = html.replace(num, `<span style="color:${C.green}">$1</span>`);
  return html;
}

// --- CodePanel component ---
function CodePanel({ lines, highlightRows = [], title = "Code", mobile = false, collapsed = false, onToggle }) {
  return (
    <div style={{
      background: C.bgCode, borderRadius: 10, border: `1px solid ${C.border}`,
      overflow: "hidden", fontFamily: "'JetBrains Mono', monospace",
      ...(mobile ? { width: "100%" } : { width: 320, minWidth: 260, flexShrink: 0 })
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.bgCard
      }}>
        <span style={{ color: C.textDim, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>{title}</span>
        {mobile && (
          <button onClick={onToggle} style={{
            background: "none", border: "none", color: C.blue, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "4px 8px"
          }}>{collapsed ? "Show ▼" : "Hide ▲"}</button>
        )}
      </div>
      {!collapsed && (
        <div style={{ padding: "8px 0", overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
          {lines.map((l, i) => {
            const hl = highlightRows.includes(i);
            return (
              <div key={i} style={{
                display: "flex", padding: "1px 14px 1px 0",
                background: hl ? `${C.blue}18` : "transparent",
                borderLeft: hl ? `3px solid ${C.blue}` : "3px solid transparent",
                transition: "background .2s, border-color .2s"
              }}>
                <span style={{ color: C.textDim, width: 32, textAlign: "right", marginRight: 10, fontSize: 12, lineHeight: "20px", userSelect: "none", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 12, lineHeight: "20px", color: C.text, whiteSpace: "pre" }} dangerouslySetInnerHTML={{ __html: highlightC(l) }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Step controls ---
function StepControls({ step, maxStep, onPrev, onNext, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 0",
      fontFamily: "'DM Sans',sans-serif"
    }}>
      <button onClick={onPrev} disabled={step === 0} style={btnStyle(step === 0)} aria-label="Previous step">← Prev</button>
      <span style={{ color: C.textDim, fontSize: 13, minWidth: 80, textAlign: "center" }}>
        Step {step + 1} / {maxStep + 1}
      </span>
      <button onClick={onNext} disabled={step === maxStep} style={btnStyle(step === maxStep)} aria-label="Next step">Next →</button>
    </div>
  );
}
function btnStyle(disabled) {
  return {
    background: disabled ? C.border : C.blue, color: disabled ? C.textDim : "#fff",
    border: "none", borderRadius: 8, padding: "10px 20px", cursor: disabled ? "default" : "pointer",
    fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, minWidth: 44, minHeight: 44,
    opacity: disabled ? 0.5 : 1, transition: "background .15s, opacity .15s"
  };
}

// --- Arrow helper ---
function arrowMarker(id, color) {
  return (
    <marker id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <path d="M0,0 L8,3 L0,6 Z" fill={color} />
    </marker>
  );
}
function curvedArrow(x1, y1, x2, y2, color, markerId, curveDir = 1) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len, ny = dx / len;
  const offset = Math.min(40, len * 0.25) * curveDir;
  const cx = mx + nx * offset, cy = my + ny * offset;
  return <path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} stroke={color} strokeWidth={2} fill="none" markerEnd={`url(#${markerId})`} />;
}

// ==================== TAB 1: Platform Model ====================
const DEVICES = [
  { label: "GPU", icon: "⊞", desc: "Massively parallel cores", color: C.green },
  { label: "FPGA", icon: "◈", desc: "Reconfigurable fabric (like Kria!)", color: C.amber },
  { label: "CPU", icon: "▣", desc: "Multi-core processor", color: C.purple },
];
const PLATFORM_STEPS = [
  { desc: "OpenCL defines a Platform — a host connected to one or more devices.", hl: [0, 1] },
  { desc: "The host queries available devices. This is like scanning for your Kria board, but portable.", hl: [2, 3, 4] },
  { desc: "A Context groups devices so they can share memory objects.", hl: [5, 6] },
  { desc: "The device contains Compute Units (CUs), each with Processing Elements (PEs) — just like your FPGA's processing pipeline replicas.", hl: [] },
  { desc: "Key insight: the same OpenCL code targets GPU, FPGA, or CPU. You write once; the runtime adapts.", hl: [] },
];

function PlatformTab({ mobile, step, onStep, maxStep }) {
  const [device, setDevice] = useState(0);
  const d = DEVICES[device];
  const s = PLATFORM_STEPS[step];
  const vw = mobile ? 360 : 540;
  const vh = mobile ? 240 : 220;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
        {DEVICES.map((dv, i) => (
          <button key={i} onClick={() => setDevice(i)} style={{
            background: device === i ? dv.color + "22" : C.bgCard,
            border: `2px solid ${device === i ? dv.color : C.border}`,
            color: device === i ? dv.color : C.textDim, borderRadius: 8,
            padding: "8px 16px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            fontSize: 13, fontWeight: 600, minHeight: 44, transition: "all .15s"
          }}>{dv.icon} {dv.label}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width: "100%", maxWidth: vw }}>
        <defs>
          {arrowMarker("arrBlue", C.blue)}
          <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" /></filter>
        </defs>
        {/* Host box */}
        <rect x={20} y={40} width={120} height={70} rx={10} fill={C.bgCard} stroke={C.purple} strokeWidth={2} filter="url(#shadow)" />
        <text x={80} y={68} textAnchor="middle" fill={C.purple} fontSize={13} fontWeight="700" fontFamily="'DM Sans',sans-serif">HOST (CPU)</text>
        <text x={80} y={88} textAnchor="middle" fill={C.textDim} fontSize={10} fontFamily="'DM Sans',sans-serif">Your program</text>
        {/* Device box */}
        <rect x={vw - 200} y={20} width={180} height={vh - 40} rx={10} fill={C.bgCard} stroke={d.color} strokeWidth={2} filter="url(#shadow)" style={{ transition: "stroke .3s" }} />
        <text x={vw - 110} y={46} textAnchor="middle" fill={d.color} fontSize={13} fontWeight="700" fontFamily="'DM Sans',sans-serif" style={{ transition: "fill .3s" }}>{d.icon} DEVICE ({d.label})</text>
        <text x={vw - 110} y={62} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">{d.desc}</text>
        {/* CU boxes inside device */}
        {step >= 3 && [0, 1].map(r => [0, 1].map(c => {
          const bx = vw - 190 + c * 82;
          const by = 72 + r * 56;
          return (
            <g key={`${r}${c}`} style={{ opacity: step >= 3 ? 1 : 0, transition: "opacity .3s" }}>
              <rect x={bx} y={by} width={74} height={46} rx={6} fill={C.bgCode} stroke={C.border} strokeWidth={1} />
              <text x={bx + 37} y={by + 18} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">CU {r * 2 + c}</text>
              {[0, 1, 2].map(p => (
                <rect key={p} x={bx + 8 + p * 22} y={by + 26} width={16} height={12} rx={3} fill={d.color + "44"} stroke={d.color} strokeWidth={0.5} />
              ))}
            </g>
          );
        }))}
        {/* Arrow host → device */}
        {curvedArrow(140, 75, vw - 200, vh / 2, C.blue, "arrBlue", 0.6)}
        <text x={(140 + vw - 200) / 2} y={vh / 2 - 18} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">PCIe / AXI</text>
      </svg>
      <div style={{
        background: C.bgCard, borderRadius: 8, padding: "10px 14px", marginTop: 8,
        color: C.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6,
        minHeight: 50, border: `1px solid ${C.border}`
      }}>{s.desc}</div>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p - 1)} onNext={() => onStep(p => p + 1)} />
    </div>
  );
}

// ==================== TAB 2: NDRange ====================
const WG_OPTIONS = [[2,2],[4,2],[4,4],[8,4]];

function NDRangeTab({ mobile, step, onStep, maxStep }) {
  const [wgIdx, setWgIdx] = useState(1);
  const [selCell, setSelCell] = useState(null);
  const cols = mobile ? 8 : 16, rows = mobile ? 4 : 8;
  const wgW = WG_OPTIONS[wgIdx][0], wgH = WG_OPTIONS[wgIdx][1];
  const cellSize = mobile ? 34 : 30;
  const gap = 2;

  const STEPS = [
    { desc: "This is the NDRange — the global work-space. Each cell is one work-item (one parallel invocation of your kernel).", hl: [0, 1, 2, 3], showGrid: true, showGroups: false, hlGroup: -1, hlCell: false },
    { desc: `The runtime divides work into work-groups of ${wgW}×${wgH}. Each group runs on one Compute Unit — similar to replicating a processing pipeline on your FPGA.`, hl: [0, 1, 2, 3], showGrid: true, showGroups: true, hlGroup: -1, hlCell: false },
    { desc: "Each work-group is a unit of scheduling. The colored regions show distinct work-groups.", hl: [0, 1, 2, 3], showGrid: true, showGroups: true, hlGroup: 0, hlCell: false },
    { desc: "Inside a work-group, each work-item has a local ID. Click any cell to see its IDs.", hl: [4], showGrid: true, showGroups: true, hlGroup: 0, hlCell: true },
    { desc: "get_global_id(0) gives the column index; get_local_id gives position within the group. On FPGA, you'd wire this addressing manually.", hl: [4, 5], showGrid: true, showGroups: true, hlGroup: -1, hlCell: true },
  ];
  const s = STEPS[step];

  function getGroupIdx(x, y) {
    const gx = Math.floor(x / wgW), gy = Math.floor(y / wgH);
    const groupsPerRow = Math.ceil(cols / wgW);
    return gy * groupsPerRow + gx;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, fontFamily: "'DM Sans',sans-serif", flexWrap: "wrap" }}>
        <span style={{ color: C.textDim, fontSize: 13 }}>Work-group size:</span>
        <input type="range" min={0} max={WG_OPTIONS.length - 1} value={wgIdx} onChange={e => { setWgIdx(+e.target.value); setSelCell(null); }}
          style={{ width: 120, accentColor: C.blue }} />
        <span style={{ color: C.blue, fontSize: 14, fontWeight: 600, minWidth: 50 }}>{wgW}×{wgH}</span>
      </div>
      <div style={{ overflowX: "auto", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap, padding: 4, position: "relative" }}>
          {Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) => {
              const gi = getGroupIdx(x, y);
              const ci = C.wg[gi % C.wg.length];
              const cb = C.wgBorder[gi % C.wgBorder.length];
              const isSel = selCell && selCell.x === x && selCell.y === y;
              const isHlGroup = s.hlGroup >= 0 && gi === s.hlGroup;
              const showBg = s.showGroups;
              return (
                <div key={`${x}-${y}`} onClick={() => (s.hlCell || s.showGroups) && setSelCell({ x, y })}
                  style={{
                    width: cellSize, height: cellSize, borderRadius: 4,
                    background: showBg ? ci : C.bgCard,
                    border: isSel ? `2px solid ${C.blue}` : (isHlGroup ? `2px solid ${cb}` : `1px solid ${C.border}`),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, color: C.textDim, cursor: s.hlCell || s.showGroups ? "pointer" : "default",
                    transition: "background .2s, border .2s",
                    opacity: s.showGrid ? 1 : 0.15,
                    fontFamily: "'JetBrains Mono',monospace"
                  }}>
                  {cellSize >= 30 ? `${x},${y}` : ""}
                </div>
              );
            })
          )}
        </div>
      </div>
      {selCell && s.showGroups && (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 14px", marginTop: 8, fontFamily: "'JetBrains Mono',monospace",
          fontSize: 12, color: C.text, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center"
        }}>
          <span>global_id: <b style={{ color: C.blue }}>({selCell.x}, {selCell.y})</b></span>
          <span>local_id: <b style={{ color: C.green }}>({selCell.x % wgW}, {selCell.y % wgH})</b></span>
          <span>group_id: <b style={{ color: C.amber }}>({Math.floor(selCell.x / wgW)}, {Math.floor(selCell.y / wgH)})</b></span>
        </div>
      )}
      <div style={{
        background: C.bgCard, borderRadius: 8, padding: "10px 14px", marginTop: 8,
        color: C.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6,
        minHeight: 44, border: `1px solid ${C.border}`
      }}>{s.desc}</div>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p - 1)} onNext={() => onStep(p => p + 1)} />
    </div>
  );
}

// ==================== TAB 3: Timeline ====================
const TL_PHASES = [
  { label: "clCreateBuffer", color: C.purple, lines: [0, 1, 2, 3, 4, 5] },
  { label: "clEnqueueWriteBuffer", color: C.amber, lines: [6, 7, 8, 9] },
  { label: "clEnqueueNDRangeKernel", color: C.green, lines: [10, 11] },
  { label: "clEnqueueReadBuffer", color: C.cyan, lines: [12, 13] },
];

function TimelineTab({ mobile, step, onStep, maxStep }) {
  const [cus, setCus] = useState(4);
  const barH = mobile ? 22 : 26;
  const barGap = 4;
  const leftMargin = mobile ? 90 : 180;
  const totalW = mobile ? 340 : 520;
  const barMaxW = totalW - leftMargin - 20;
  const STEPS = [
    { phase: -1, desc: "The host orchestrates execution through a command queue. Let's step through each phase." },
    { phase: 0, desc: "First, allocate memory buffers on the device — analogous to instantiating BRAM or DDR interfaces on FPGA." },
    { phase: 1, desc: "Transfer input data from host to device memory — like DMA writes in your Kria designs." },
    { phase: 2, desc: `Launch the kernel! ${cus} Compute Units execute work-groups in parallel. Adjust the slider to see how more CUs reduce execution time.` },
    { phase: 3, desc: "Read results back from device to host — the DMA read-back step." },
    { phase: 4, desc: "Done! The entire pipeline: allocate → write → execute → read. On FPGA you wired this manually; OpenCL automates it." },
  ];
  const s = STEPS[step];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, fontFamily: "'DM Sans',sans-serif", flexWrap: "wrap" }}>
        <span style={{ color: C.textDim, fontSize: 13 }}>Compute Units:</span>
        <input type="range" min={1} max={8} value={cus} onChange={e => setCus(+e.target.value)} style={{ width: 120, accentColor: C.green }} />
        <span style={{ color: C.green, fontSize: 14, fontWeight: 600, minWidth: 20 }}>{cus}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${totalW} ${barH * 5 + barGap * 6 + 30 + (s.phase === 2 ? (cus - 1) * (barH * 0.6 + 2) : 0)}`} style={{ width: "100%", maxWidth: totalW }}>
          {TL_PHASES.map((ph, i) => {
            const active = s.phase >= i;
            const current = s.phase === i;
            const y = 10 + i * (barH + barGap);
            if (i === 2 && s.phase >= 2) {
              // Show multiple work-group bars
              const smallH = barH * 0.6;
              return (
                <g key={i}>
                  <text x={leftMargin - 8} y={y + smallH / 2 + 4} textAnchor="end" fill={current ? ph.color : C.textDim} fontSize={mobile ? 9 : 11} fontFamily="'JetBrains Mono',monospace" fontWeight={current ? 700 : 400}>{ph.label}</text>
                  {Array.from({ length: cus }, (_, c) => (
                    <rect key={c} x={leftMargin} y={y + c * (smallH + 2)} width={active ? barMaxW / (cus <= 2 ? 1 : Math.log2(cus) + 1) * (cus <= 2 ? 0.8 : 1) : 0} height={smallH} rx={4}
                      fill={ph.color + (current ? "bb" : "55")} stroke={current ? ph.color : "none"} strokeWidth={1}
                      style={{ transition: "width .4s ease-out" }} />
                  ))}
                  {current && (
                    <text x={leftMargin + 4} y={y + cus * (smallH + 2) + 12} fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">
                      {cus} CU{cus > 1 ? "s" : ""} in parallel
                    </text>
                  )}
                </g>
              );
            }
            const yOff = s.phase >= 2 ? (cus - 1) * (barH * 0.6 + 2) : 0;
            const ay = i > 2 ? y + yOff : y;
            return (
              <g key={i}>
                <text x={leftMargin - 8} y={ay + barH / 2 + 4} textAnchor="end" fill={current ? ph.color : C.textDim} fontSize={mobile ? 9 : 11} fontFamily="'JetBrains Mono',monospace" fontWeight={current ? 700 : 400}>{ph.label}</text>
                <rect x={leftMargin} y={ay} width={active ? barMaxW * (i === 2 ? 0.6 : i === 0 ? 0.3 : 0.5) : 0} height={barH} rx={4}
                  fill={ph.color + (current ? "bb" : "55")} stroke={current ? ph.color : "none"} strokeWidth={1}
                  style={{ transition: "width .4s ease-out" }} />
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{
        background: C.bgCard, borderRadius: 8, padding: "10px 14px", marginTop: 8,
        color: C.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6,
        minHeight: 44, border: `1px solid ${C.border}`
      }}>{s.desc}</div>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p - 1)} onNext={() => onStep(p => p + 1)} />
    </div>
  );
}

// ==================== TAB 4: FPGA Comparison ====================
const CMP_STEPS = [
  { desc: "Define the computation: OpenCL kernel function vs. HLS C function. Both describe what each parallel unit does.", oclHl: [0, 1, 2, 3, 4, 5, 6], hlsHl: [0, 1, 7, 8, 9] },
  { desc: "Interface declaration: OpenCL uses __global pointers; HLS uses #pragma to specify AXI interfaces.", oclHl: [1, 2, 3], hlsHl: [2, 3, 4] },
  { desc: "Parallelism: OpenCL launches thousands of work-items via get_global_id; HLS pipelines a loop with #pragma PIPELINE.", oclHl: [4, 5], hlsHl: [5, 6, 7] },
  { desc: "Deployment: OpenCL compiles at runtime for any device. HLS goes through synthesis → place & route → bitstream for one specific FPGA.", oclHl: [], hlsHl: [] },
  { desc: "Key trade-off: OpenCL is portable and easier to program. FPGA/HLS gives fine-grained control over timing, resources, and I/O — which you've already experienced on Kria.", oclHl: [], hlsHl: [] },
];

function ComparisonTab({ mobile, step, onStep, maxStep }) {
  const s = CMP_STEPS[step];
  const cols = mobile ? "1fr" : "1fr 1fr";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10 }}>
        <CodePanel lines={CODE.kernel} highlightRows={s.oclHl} title="OpenCL Kernel" mobile={mobile} />
        <CodePanel lines={CODE.hls} highlightRows={s.hlsHl} title="HLS (FPGA)" mobile={mobile} />
      </div>
      <div style={{
        background: C.bgCard, borderRadius: 8, padding: "10px 14px", marginTop: 10,
        color: C.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6,
        minHeight: 44, border: `1px solid ${C.border}`
      }}>{s.desc}</div>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p - 1)} onNext={() => onStep(p => p + 1)} />
    </div>
  );
}

// ==================== Main App ====================
const TABS = [
  { label: "Platform", shortLabel: "Platform", icon: "◉" },
  { label: "NDRange", shortLabel: "NDRange", icon: "⊞" },
  { label: "Timeline", shortLabel: "Timeline", icon: "▶" },
  { label: "Comparison", shortLabel: "Compare", icon: "⇄" },
];

export default function OpenCLDemo() {
  const [tab, setTab] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [codeCollapsed, setCodeCollapsed] = useState(false);
  // Per-tab step state so it persists across tab switches
  const [steps, setSteps] = useState([0, 0, 0, 0]);
  const setCurrentStep = useCallback((s) => {
    setSteps(prev => { const n = [...prev]; n[tab] = typeof s === "function" ? s(prev[tab]) : s; return n; });
  }, [tab]);
  const currentStep = steps[tab];

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Max steps per tab
  const maxSteps = [PLATFORM_STEPS.length - 1, 4, 5, CMP_STEPS.length - 1];

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); setCurrentStep(p => Math.max(0, p - 1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setCurrentStep(p => Math.min(maxSteps[tab], p + 1)); }
      else if (e.key === "Home") { e.preventDefault(); setCurrentStep(0); }
      else if (e.key === "End") { e.preventDefault(); setCurrentStep(maxSteps[tab]); }
      else if (e.key >= "1" && e.key <= "4") { setTab(+e.key - 1); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, setCurrentStep]);

  // Code lines & highlight for side panel (tabs 0-2)
  const getCodeInfo = () => {
    if (tab === 0) return { lines: CODE.platform, title: "Host Setup", hl: PLATFORM_STEPS[currentStep]?.hl || [] };
    if (tab === 1) {
      const ndHls = [[0,1,2,3],[0,1,2,3],[0,1,2,3],[4],[4,5]];
      return { lines: CODE.kernel, title: "Kernel", hl: ndHls[currentStep] || [] };
    }
    if (tab === 2) {
      const phase = [{ phase: -1 },{ phase: 0 },{ phase: 1 },{ phase: 2 },{ phase: 3 },{ phase: 4 }][currentStep]?.phase ?? -1;
      const tlHls = { [-1]: [], 0: [0,1,2,3,4,5], 1: [6,7,8,9], 2: [10,11], 3: [12,13], 4: Array.from({length:14},(_,i)=>i) };
      return { lines: CODE.host, title: "Host Code", hl: tlHls[phase] || [] };
    }
    return null;
  };
  const codeInfo = getCodeInfo();

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      fontFamily: "'DM Sans', sans-serif", padding: mobile ? "10px 6px" : "20px 24px"
    }}>
      <link href={FONTS_URL} rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        button:focus-visible { outline: 2px solid ${C.blue}; outline-offset: 2px; }
        input[type=range] { height: 6px; }
        input[type=range]::-webkit-slider-thumb { width: 22px; height: 22px; }
        @media (max-width: 767px) {
          input[type=range]::-webkit-slider-thumb { width: 28px; height: 28px; }
        }
      `}</style>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: mobile ? 10 : 16 }}>
        <h1 style={{ fontSize: mobile ? 20 : 26, fontWeight: 700, margin: "0 0 4px", color: C.text, letterSpacing: -0.5 }}>
          OpenCL <span style={{ color: C.blue }}>Interactive</span> Demo
        </h1>
        <p style={{ color: C.textDim, fontSize: mobile ? 12 : 13, margin: 0 }}>
          From FPGA to portable parallel computing • ← → to step • 1-4 to switch tabs
        </p>
      </div>
      {/* Tab bar */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 4, marginBottom: mobile ? 10 : 16,
        overflowX: "auto", padding: "0 4px"
      }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: tab === i ? C.blue + "22" : "transparent",
            border: "none", borderBottom: tab === i ? `3px solid ${C.blue}` : "3px solid transparent",
            color: tab === i ? C.blue : C.textDim,
            padding: mobile ? "10px 12px" : "10px 20px",
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            fontSize: mobile ? 12 : 14, fontWeight: tab === i ? 700 : 500,
            borderRadius: "8px 8px 0 0", transition: "all .15s",
            whiteSpace: "nowrap", minHeight: 44
          }}>
            <span style={{ marginRight: 6 }}>{t.icon}</span>
            {mobile ? t.shortLabel : t.label}
          </button>
        ))}
      </div>
      {/* Content area */}
      {tab === 3 ? (
        <ComparisonTab mobile={mobile} step={currentStep}
          onStep={setCurrentStep} maxStep={maxSteps[3]} />
      ) : (
        <div style={{ display: mobile ? "block" : "flex", gap: 16, alignItems: "flex-start" }}>
          {codeInfo && (
            <CodePanel lines={codeInfo.lines} highlightRows={codeInfo.hl} title={codeInfo.title}
              mobile={mobile} collapsed={mobile && codeCollapsed}
              onToggle={() => setCodeCollapsed(c => !c)} />
          )}
          <div style={{ flex: 1, minWidth: 0, marginTop: mobile ? 10 : 0 }}>
            {tab === 0 && <PlatformTab mobile={mobile} step={currentStep}
              onStep={setCurrentStep} maxStep={maxSteps[0]} />}
            {tab === 1 && <NDRangeTab mobile={mobile} step={currentStep}
              onStep={setCurrentStep} maxStep={maxSteps[1]} />}
            {tab === 2 && <TimelineTab mobile={mobile} step={currentStep}
              onStep={setCurrentStep} maxStep={maxSteps[2]} />}
          </div>
        </div>
      )}
    </div>
  );
}
