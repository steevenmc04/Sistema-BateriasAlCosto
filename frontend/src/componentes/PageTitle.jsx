const PageTitle = ({ eyebrow, titleWhite, titleGold, subtitle, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    <div className="flex items-center gap-3">
      <div className="h-1 w-10 rounded-full bg-yellow-400" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-100">{eyebrow}</p>
    </div>
    <h1 className="page-title drop-shadow-md">
      <span className="text-white">{titleWhite}</span>{' '}
      <span className="text-yellow-300">{titleGold}</span>
    </h1>
    {subtitle ? <p className="text-sm text-text-muted max-w-xl">{subtitle}</p> : null}
  </div>
);

export default PageTitle;
