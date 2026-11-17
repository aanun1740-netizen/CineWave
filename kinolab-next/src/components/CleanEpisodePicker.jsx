import { useState } from "react";

const labels = {
  hy: { season: "Սեզոն", episode: "Սերիա" },
  ru: { season: "Сезон", episode: "Серия" },
  en: { season: "Season", episode: "Episode" },
};

export function useCleanEpisodes(movie) {
  const [selection, setSelection] = useState(null);
  const clean = movie?.playbackMode === "clean";
  const episodes = clean && movie.mediaType === "tv" ? movie.episodes || [] : [];
  const selected = episodes.find(item => selection?.id === movie.id &&
    item.season === selection.season && item.episode === selection.episode) || episodes[0];

  function selectEpisode(item) {
    setSelection({ id: movie.id, season: item.season, episode: item.episode });
  }

  return {
    episodes, selected, selectEpisode,
    source: clean ? selected?.url || movie.externalWatch : null,
  };
}

export default function CleanEpisodePicker({ episodes, selected, selectEpisode, language }) {
  if (!selected) return null;
  const text = labels[language] || labels.en;
  const seasons = [...new Set(episodes.map(item => item.season))];
  const seasonEpisodes = episodes.filter(item => item.season === selected.season);
  return (
    <div className="clean-episode-picker">
      <label>{text.season}
        <select aria-label={text.season} value={selected.season}
          onChange={event => selectEpisode(episodes.find(item => item.season === Number(event.target.value)))}>
          {seasons.map(season => <option key={season} value={season}>{season}</option>)}
        </select>
      </label>
      <label>{text.episode}
        <select aria-label={text.episode} value={selected.episode}
          onChange={event => selectEpisode(seasonEpisodes.find(item => item.episode === Number(event.target.value)))}>
          {seasonEpisodes.map(item => <option key={item.episode} value={item.episode}>{item.episode}</option>)}
        </select>
      </label>
    </div>
  );
}
