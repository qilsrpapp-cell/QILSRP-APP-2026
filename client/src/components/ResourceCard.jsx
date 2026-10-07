import './ResourceCard.css';

export default function ResourceCard({ image, title, description, fileType, fileSize, onDownload,onClick }) {
  return (
    <article className="resource-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { 
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); 
          onClick(e); 
        }
      } : undefined}>
      <div className="resource-card-image-wrap">
        <img src={image} alt="" className="resource-card-image" />
      </div>

      <div className="resource-card-body">
        <h3 className="resource-card-title">{title}</h3>
        <p className="resource-card-desc">{description}</p>

        <div className="resource-card-footer">
          <div className="resource-card-meta">
            <span className="resource-card-type">{fileType}</span>
            <span className="resource-card-size">{fileSize}</span>
          </div>
          <button
            type="button"
            className="resource-card-download"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            aria-label={`Download ${title}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
