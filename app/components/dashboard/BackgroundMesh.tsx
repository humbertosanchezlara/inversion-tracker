export default function BackgroundMesh() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-20 -top-40 h-[520px] w-[520px] bg-[radial-gradient(circle_at_center,rgba(103,232,200,0.18),transparent_60%)] blur-[20px]" />
      <div className="absolute -right-[120px] top-60 h-[560px] w-[560px] bg-[radial-gradient(circle_at_center,rgba(245,193,108,0.12),transparent_65%)] blur-[20px]" />
      <div className="absolute -bottom-[260px] left-[30%] h-[680px] w-[680px] bg-[radial-gradient(circle_at_center,rgba(122,169,247,0.10),transparent_65%)] blur-[20px]" />
      <div className="absolute bottom-[120px] right-[20%] h-[480px] w-[480px] bg-[radial-gradient(circle_at_center,rgba(197,148,241,0.09),transparent_65%)] blur-[20px]" />
    </div>
  );
}
