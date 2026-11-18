import { allowedExternalMovie } from "../services/external-links";

export default function TrailerAction({ url, onPlay, children }) {
  if (!allowedExternalMovie(url)) return null;
  if (onPlay) {
    return <button type="button" className="btn secondary" onClick={onPlay}>{children}</button>;
  }
  return <a className="btn secondary" href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
}
