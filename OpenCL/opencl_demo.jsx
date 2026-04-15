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
  memory: [
    "__kernel void vec_add(",
    "    __global const float* A,",
    "    __global const float* B,",
    "    __global float* C,",
    "    __local float* scratch) {",
    "  int gid = get_global_id(0);",
    "  int lid = get_local_id(0);",
    "  scratch[lid] = A[gid];",
    "  barrier(CLK_LOCAL_MEM_FENCE);",
    "  C[gid] = scratch[lid] + B[gid];",
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

function highlightC(line) {
  let html = line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  html = html.replace(/(#pragma\s+HLS\s+\w+)/g, `<span style="color:${C.amber}">$1</span>`);
  html = html.replace(/\b(__kernel|__global|__local|__constant|void|float|int|const|for|NULL|CL_\w+)\b/g, `<span style="color:${C.purple}">$1</span>`);
  html = html.replace(/\b(clGet\w+|clCreate\w+|clEnqueue\w+|get_global_id|get_local_id|get_group_id|barrier|CLK_LOCAL_MEM_FENCE)\b/g, `<span style="color:${C.blue}">$1</span>`);
  html = html.replace(/\b(\d+)\b/g, `<span style="color:${C.green}">$1</span>`);
  return html;
}

function CodePanel({ lines, highlightRows = [], title = "Code", mobile = false, collapsed = false, onToggle, fullWidth = false }) {
  return (
    <div style={{
      background: C.bgCode, borderRadius: 10, border: `1px solid ${C.border}`,
      overflow: "hidden", fontFamily: "'JetBrains Mono', monospace",
      ...(fullWidth || mobile ? { width: "100%" } : { width: 320, minWidth: 260, flexShrink: 0 })
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.bgCard
      }}>
        <span style={{ color: C.textDim, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>{title}</span>
        {mobile && onToggle && (
          <button onClick={onToggle} style={{
            background: "none", border: "none", color: C.blue, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "4px 8px"
          }}>{collapsed ? "Show ▼" : "Hide ▲"}</button>
        )}
      </div>
      {!collapsed && (
        <div style={{ padding: "8px 0", overflowX: "auto", maxHeight: 340, overflowY: "auto" }}>
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

function StepControls({ step, maxStep, onPrev, onNext }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 0", fontFamily: "'DM Sans',sans-serif" }}>
      <button onClick={onPrev} disabled={step === 0} style={btnStyle(step === 0)} aria-label="Previous step">← Prev</button>
      <span style={{ color: C.textDim, fontSize: 13, minWidth: 80, textAlign: "center" }}>Step {step + 1} / {maxStep + 1}</span>
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

function DescBox({ children }) {
  return (
    <div style={{
      background: C.bgCard, borderRadius: 8, padding: "10px 14px", marginTop: 8,
      color: C.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6,
      minHeight: 44, border: `1px solid ${C.border}`
    }} dangerouslySetInnerHTML={typeof children === "string" ? { __html: children } : undefined}>
      {typeof children !== "string" ? children : undefined}
    </div>
  );
}

function qArrow(x1, y1, x2, y2, color, markerId, curveDir = 1) {
  const mx = (x1+x2)/2, my = (y1+y2)/2, dx = x2-x1, dy = y2-y1;
  const len = Math.sqrt(dx*dx + dy*dy), nx = -dy/len, ny = dx/len;
  const off = Math.min(40, len * 0.25) * curveDir;
  return <path d={`M${x1},${y1} Q${mx+nx*off},${my+ny*off} ${x2},${y2}`} stroke={color} strokeWidth={2} fill="none" markerEnd={`url(#${markerId})`} />;
}
function ArrowDefs() {
  return (
    <defs>
      <marker id="arrBlue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill={C.blue}/></marker>
      <marker id="arrGreen" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill={C.green}/></marker>
      <marker id="arrAmber" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill={C.amber}/></marker>
      <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/></filter>
    </defs>
  );
}

// ======================== TAB 0: Platform ========================
const DEVICES = [
  { label: "GPU", icon: "⊞", desc: "Massively parallel cores", color: C.green },
  { label: "FPGA", icon: "◈", desc: "Reconfigurable fabric (like Kria!)", color: C.amber },
  { label: "CPU", icon: "▣", desc: "Multi-core processor", color: C.purple },
];
const PLATFORM_STEPS = [
  { desc: "OpenCL defines a <b>Platform Model</b> — a host CPU connected to one or more compute devices via a bus (PCIe for GPU, AXI for FPGA).", hl: [0,1] },
  { desc: "The host queries available devices using <code>clGetDeviceIDs</code>. This is like scanning for your Kria board, but device-agnostic.", hl: [2,3,4] },
  { desc: "A <b>Context</b> groups devices so they can share memory objects and command queues.", hl: [5,6] },
  { desc: "Each device contains <b>Compute Units</b> (CUs). On a GPU these are streaming multiprocessors; on Kria they are your replicated processing pipelines.", hl: [] },
  { desc: "Each CU contains <b>Processing Elements</b> (PEs) — the individual ALUs. On FPGA, these map to the datapath inside each pipeline stage.", hl: [] },
  { desc: "Key idea: the <b>same code</b> targets GPU, FPGA, or CPU. Toggle the device type above — the hierarchy stays the same. This is portability.", hl: [] },
];

function PlatformTab({ mobile, step, onStep, maxStep }) {
  const [device, setDevice] = useState(0);
  const d = DEVICES[device];
  const s = PLATFORM_STEPS[step];
  const vw = mobile ? 360 : 560, vh = mobile ? 260 : 240;
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
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width: "100%", maxWidth: vw }}>
        <ArrowDefs />
        <rect x={20} y={40} width={130} height={80} rx={10} fill={C.bgCard} stroke={C.purple} strokeWidth={2} filter="url(#shadow)" />
        <text x={85} y={68} textAnchor="middle" fill={C.purple} fontSize={13} fontWeight="700" fontFamily="'DM Sans',sans-serif">HOST (CPU)</text>
        <text x={85} y={86} textAnchor="middle" fill={C.textDim} fontSize={10} fontFamily="'DM Sans',sans-serif">Your application</text>
        <text x={85} y={102} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'JetBrains Mono',monospace">cmd queue</text>
        <rect x={vw-200} y={20} width={180} height={vh-40} rx={10} fill={C.bgCard} stroke={d.color} strokeWidth={2} filter="url(#shadow)" style={{ transition: "stroke .3s" }} />
        <text x={vw-110} y={46} textAnchor="middle" fill={d.color} fontSize={13} fontWeight="700" fontFamily="'DM Sans',sans-serif" style={{ transition: "fill .3s" }}>{d.icon} DEVICE ({d.label})</text>
        <text x={vw-110} y={62} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">{d.desc}</text>
        {step >= 3 && [0,1].map(r => [0,1].map(c => {
          const bx = vw-190+c*82, by = 72+r*56;
          return (
            <g key={`${r}${c}`} style={{ opacity: 1, transition: "opacity .3s" }}>
              <rect x={bx} y={by} width={74} height={46} rx={6} fill={C.bgCode} stroke={C.border} strokeWidth={1} />
              <text x={bx+37} y={by+18} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">CU {r*2+c}</text>
              {[0,1,2].map(p => (
                <rect key={p} x={bx+8+p*22} y={by+26} width={16} height={12} rx={3} fill={d.color+"44"} stroke={d.color} strokeWidth={0.5} />
              ))}
            </g>
          );
        }))}
        {qArrow(150, 80, vw-200, vh/2, C.blue, "arrBlue", 0.5)}
        <text x={(150+vw-200)/2} y={vh/2-20} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">PCIe / AXI</text>
      </svg>
      <DescBox>{s.desc}</DescBox>
      <StepControls step={step} maxStep={maxStep} onPrev={() => onStep(p => p-1)} onNext={() => onStep(p => p+1)} />
    </div>
  );
}

// ======================== TAB 1: Memory ========================
const MEM_REGIONS = [
  { id: "host", label: "Host Memory", color: C.purple, sub: "CPU RAM — your application data", blocks: ["hostA[]","hostB[]","hostC[]"], fpga: "PS DDR on Kria" },
  { id: "global", label: "Global Memory", color: C.green, sub: "Device RAM — accessible by all work-items", blocks: ["bufA","bufB","bufC"], fpga: "PL DDR via AXI" },
  { id: "constant", label: "Constant Memory", color: C.cyan, sub: "Read-only cached global memory", blocks: ["lookup_table","coefficients"], fpga: "ROM / LUT in BRAM" },
  { id: "local", label: "Local Memory", color: C.amber, sub: "Shared within a work-group — fast scratchpad", blocks: ["scratch[WG_SIZE]"], fpga: "BRAM per CU" },
  { id: "private", label: "Private Memory", color: C.pink, sub: "Per work-item registers", blocks: ["gid","lid","temp"], fpga: "Flip-flops / registers" },
];
const MEM_STEPS = [
  { desc: "OpenCL defines a <b>Memory Model</b> with four device regions plus host memory, each with different scope and speed. On your FPGA, you managed BRAM vs DDR manually — OpenCL names these layers.", hl: [], regions: ["host"] },
  { desc: "<b>Global Memory</b> — accessible by all work-items. Largest but slowest. On FPGA: DDR via AXI. On GPU: VRAM.", hl: [0,1,2,3], regions: ["host","global"] },
  { desc: "<b>Constant Memory</b> — read-only cached subset of global memory. On FPGA this maps to ROM or constant lookup tables.", hl: [1,2], regions: ["host","global","constant"] },
  { desc: "<b>Local Memory</b> — shared within a work-group, very fast. On GPU: shared memory. On FPGA: BRAM allocated per compute unit.", hl: [4,7,8], regions: ["host","global","constant","local"] },
  { desc: "<b>Private Memory</b> — per work-item registers. On FPGA these are flip-flops. Fastest, smallest.", hl: [5,6,9,10], regions: ["host","global","constant","local","private"] },
  { desc: "Data flows: Host → Global (<code>clEnqueueWriteBuffer</code>) → Local (kernel copies) → Private (registers). Results flow back. On FPGA you wire this via DMA + AXI + BRAM.", hl: [], regions: ["host","global","constant","local","private"] },
];

function MemoryTab({ mobile, step, onStep, maxStep }) {
  const s = MEM_STEPS[step];
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {MEM_REGIONS.map(r => (
          <div key={r.id} style={{
            borderRadius: 10, padding: "10px 14px", border: `2px solid ${r.color}`,
            background: r.color + "0a", opacity: s.regions.includes(r.id) ? 1 : 0.2,
            transition: "opacity .3s"
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: r.color, marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 11, color: C.textDim }}>{r.sub}</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>FPGA equiv: <span style={{ color: r.color }}>{r.fpga}</span></div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {r.blocks.map(b => (
                <div key={b} style={{
                  background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'JetBrains Mono',monospace"
                }}>{b}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {step >= 5 && (() => {
        const w = mobile ? 300 : 460;
        const pts = [
          { x: 10, label: "Host", color: C.purple },
          { x: mobile ? 75 : 115, label: "Global", color: C.green },
          { x: mobile ? 150 : 230, label: "Local", color: C.amber },
          { x: mobile ? 225 : 345, label: "Private", color: C.pink },
        ];
        return (
          <svg viewBox={`0 0 ${w} 50`} style={{ width: "100%", maxWidth: w, display: "block", margin: "8px auto" }}>
            <ArrowDefs />
            {pts.map((p, i) => <text key={i} x={p.x} y={20} fill={p.color} fontSize={10} fontFamily="'DM Sans',sans-serif" fontWeight="600">{p.label}</text>)}
            <line x1={40} y1={30} x2={mobile?75:115} y2={30} stroke={C.green} strokeWidth={2} markerEnd="url(#arrGreen)" />
            <line x1={mobile?110:155} y1={30} x2={mobile?150:230} y2={30} stroke={C.amber} strokeWidth={2} markerEnd="url(#arrAmber)" />
            <line x1={mobile?185:270} y1={30} x2={mobile?225:345} y2={30} stroke={C.blue} strokeWidth={2} markerEnd="url(#arrBlue)" />
            <text x={w/2} y={46} textAnchor="middle" fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">Data flows: Host → Global → Local → Private</text>
          </svg>
        );
      })()}
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
  { desc: "Each work-group is a unit of scheduling. The colored regions show distinct groups.", showGroups: true, hlGroup: 0, hlCell: false },
  { desc: "Inside a work-group, each work-item has a <b>local ID</b>. Click any cell to see its IDs.", showGroups: true, hlGroup: 0, hlCell: true },
  { desc: "<code>get_global_id(0)</code> gives the column; <code>get_local_id</code> gives position within the group.", showGroups: true, hlGroup: -1, hlCell: true },
];

function NDRangeTab({ mobile, step, onStep, maxStep }) {
  const [wgIdx, setWgIdx] = useState(1);
  const [selCell, setSelCell] = useState(null);
  const cols = mobile ? 8 : 16, rows = mobile ? 4 : 8;
  const wgW = WG_OPTIONS[wgIdx][0], wgH = WG_OPTIONS[wgIdx][1];
  const cellSize = mobile ? 34 : 30;
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
          {Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) => {
              const gi = getGI(x, y);
              const isSel = selCell && selCell.x === x && selCell.y === y;
              const isHl = s.hlGroup >= 0 && gi === s.hlGroup;
              const ok = s.hlCell || s.showGroups;
              return (
                <div key={`${x}-${y}`} onClick={() => ok && setSelCell({ x, y })}
                  style={{
                    width: cellSize, height: cellSize, borderRadius: 4,
                    background: s.showGroups ? C.wg[gi%C.wg.length] : C.bgCard,
                    border: isSel ? `2px solid ${C.blue}` : (isHl ? `2px solid ${C.wgBorder[gi%C.wgBorder.length]}` : `1px solid ${C.border}`),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, color: C.textDim, cursor: ok ? "pointer" : "default",
                    transition: "background .2s, border .2s", fontFamily: "'JetBrains Mono',monospace"
                  }}>{cellSize >= 30 ? `${x},${y}` : ""}</div>
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
  { label: "clCreateBuffer", color: C.purple },
  { label: "clEnqueueWriteBuffer", color: C.amber },
  { label: "clEnqueueNDRangeKernel", color: C.green },
  { label: "clEnqueueReadBuffer", color: C.cyan },
];
const TL_STEPS = [
  { phase: -1, desc: "The host orchestrates execution through a <b>command queue</b>. Let's step through each phase." },
  { phase: 0, desc: "Allocate memory buffers on the device — analogous to instantiating BRAM or DDR interfaces on FPGA." },
  { phase: 1, desc: "Transfer input data from host to device — like DMA writes in your Kria designs." },
  { phase: 2, desc: "Launch the kernel! Compute Units execute work-groups in parallel. Adjust the slider to see how more CUs speed things up." },
  { phase: 3, desc: "Read results back from device to host — the DMA read-back step." },
  { phase: 4, desc: "Done! The entire pipeline: allocate → write → execute → read. On FPGA you wired this manually; OpenCL automates it." },
];

function TimelineTab({ mobile, step, onStep, maxStep }) {
  const [cus, setCus] = useState(4);
  const barH = mobile ? 22 : 26, barGap = 4;
  const lm = mobile ? 95 : 185, tw = mobile ? 350 : 540, bmw = tw - lm - 20;
  const s = TL_STEPS[step];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, fontFamily: "'DM Sans',sans-serif", flexWrap: "wrap" }}>
        <span style={{ color: C.textDim, fontSize: 13 }}>Compute Units:</span>
        <input type="range" min={1} max={8} value={cus} onChange={e => setCus(+e.target.value)} style={{ width: 120, accentColor: C.green }} />
        <span style={{ color: C.green, fontSize: 14, fontWeight: 600, minWidth: 20 }}>{cus}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${tw} ${barH*5+barGap*6+30+(s.phase>=2?(cus-1)*(barH*0.6+2):0)}`} style={{ width: "100%", maxWidth: tw }}>
          {(() => {
            let els = [], yo = 0;
            for (let i = 0; i < 4; i++) {
              const ph = TL_PHASES[i], act = s.phase >= i, cur = s.phase === i;
              const y = 10 + i*(barH+barGap) + yo;
              if (i===2 && s.phase>=2) {
                const sh = barH*0.6, bw = act ? bmw/(cus<=2?1:Math.log2(cus)+1)*(cus<=2?0.8:1) : 0;
                els.push(<g key={i}>
                  <text x={lm-8} y={y+sh/2+4} textAnchor="end" fill={cur?ph.color:C.textDim} fontSize={mobile?9:11} fontFamily="'JetBrains Mono',monospace" fontWeight={cur?700:400}>{ph.label}</text>
                  {Array.from({length:cus},(_,c) => <rect key={c} x={lm} y={y+c*(sh+2)} width={bw} height={sh} rx={4} fill={ph.color+(cur?"bb":"55")} stroke={cur?ph.color:"none"} strokeWidth={1} style={{transition:"width .4s ease-out"}}/>)}
                  {cur && <text x={lm+4} y={y+cus*(sh+2)+12} fill={C.textDim} fontSize={9} fontFamily="'DM Sans',sans-serif">{cus} CU{cus>1?"s":""} in parallel</text>}
                </g>);
                yo += (cus-1)*(sh+2);
              } else {
                const bw = act ? bmw*(i===0?0.3:0.5) : 0;
                els.push(<g key={i}>
                  <text x={lm-8} y={y+barH/2+4} textAnchor="end" fill={cur?ph.color:C.textDim} fontSize={mobile?9:11} fontFamily="'JetBrains Mono',monospace" fontWeight={cur?700:400}>{ph.label}</text>
                  <rect x={lm} y={y} width={bw} height={barH} rx={4} fill={ph.color+(cur?"bb":"55")} stroke={cur?ph.color:"none"} strokeWidth={1} style={{transition:"width .4s ease-out"}}/>
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
  { desc: "<b>Define the computation:</b> OpenCL kernel function vs HLS C function.", oclHl: [0,1,2,3,4,5,6], hlsHl: [0,1,7,8,9] },
  { desc: "<b>Interface declaration:</b> OpenCL uses <code>__global</code> pointers; HLS uses <code>#pragma</code> for AXI interfaces.", oclHl: [1,2,3], hlsHl: [2,3,4] },
  { desc: "<b>Parallelism:</b> OpenCL launches work-items via <code>get_global_id</code>; HLS pipelines a loop.", oclHl: [4,5], hlsHl: [5,6,7] },
  { desc: "<b>Deployment:</b> OpenCL compiles at runtime for any device. HLS synthesizes a bitstream for one FPGA.", oclHl: [], hlsHl: [] },
  { desc: "<b>Key trade-off:</b> OpenCL = portable &amp; easier. FPGA/HLS = fine-grained control over timing, resources, I/O.", oclHl: [], hlsHl: [] },
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
    if (tab===2) {
      const h=[[0,1,2,3],[0,1,2,3],[0,1,2,3],[4],[4,5]];
      return { lines: CODE.kernel, title: "Kernel", hl: h[currentStep]||[] };
    }
    if (tab===3) {
      const p=TL_STEPS[currentStep]?.phase??-1;
      const m={[-1]:[],0:[0,1,2,3,4,5],1:[6,7,8,9],2:[10,11],3:[12,13],4:Array.from({length:14},(_,i)=>i)};
      return { lines: CODE.host, title: "Host Code", hl: m[p]||[] };
    }
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
        <p style={{ color: C.textDim, fontSize: mobile?12:13, margin: 0 }}>
          From FPGA to portable parallel computing · ← → to step · 1-5 to switch tabs
        </p>
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
          }}>
            <span style={{ marginRight: 4 }}>{t.icon}</span>{mobile?t.short:t.label}
          </button>
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
