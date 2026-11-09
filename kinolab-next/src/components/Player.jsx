import { useEffect, useRef } from "react";
import Hls from "hls.js/dist/hls.light.mjs";
import "../../player.js";
window.Hls = Hls;
export const playback = window.CineWavePlayer;
export default function Player({ movie, language, onProgress }) {
  const root = useRef(null),
    instance = useRef(null),
    notify = useRef(onProgress);
  notify.current = onProgress;
  useEffect(() => {
    const player = playback.mount(root.current, movie, language);
    instance.current = player;
    const progress = () => notify.current?.();
    player.video.addEventListener("timeupdate", progress);
    return () => {
      player.video.removeEventListener("timeupdate", progress);
      player.destroy();
      instance.current = null;
      notify.current?.();
    };
  }, [movie.id, movie.video, movie.renditions]);
  useEffect(() => instance.current?.localize(language), [language]);
  return <div ref={root} />;
}
