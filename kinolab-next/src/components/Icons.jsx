export function Icon({ name }) {
  return (
    <svg aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
export function Icons() {
  return (
    <svg
      className="icon-defs"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <symbol id="i-play" viewBox="0 0 24 24">
          <path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </symbol>
        <symbol id="i-user" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
        </symbol>
        <symbol id="i-bookmark" viewBox="0 0 24 24">
          <path d="M6 3.5h12v17L12 16l-6 4.5z" />
        </symbol>
        <symbol id="i-settings" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M10 2.5h4l.7 2.5a8 8 0 0 1 2 .9l2.3-1.2 2.7 2.7-1.2 2.3a8 8 0 0 1 .9 2l2.5.7v4l-2.5.7a8 8 0 0 1-.9 2l1.2 2.3-2.7 2.7-2.3-1.2a8 8 0 0 1-2 .9L14 24h-4l-.7-2.5a8 8 0 0 1-2-.9L5 21.8l-2.7-2.7 1.2-2.3a8 8 0 0 1-.9-2L.1 14v-4l2.5-.7a8 8 0 0 1 .9-2L2.3 5l2.7-2.7 2.3 1.2a8 8 0 0 1 2-.9z" transform="translate(1.1 0) scale(.91)" />
        </symbol>
        <symbol id="i-heart" viewBox="0 0 24 24">
          <path d="M20 5c-3-3-6-1-8 1C5-2-4 9 12 21 22 14 24 9 20 5Z" />
        </symbol>
        <symbol id="i-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M19.07 4.93l-1.42 1.42M6.35 17.65l-1.42 1.42" />
        </symbol>
        <symbol id="i-moon" viewBox="0 0 24 24">
          <path d="M20.8 13.1A8.5 8.5 0 0 1 10.9 3.2 8.6 8.6 0 1 0 20.8 13.1Z" />
        </symbol>
        <symbol id="i-info" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6m0-10v1" />
        </symbol>
      </defs>
    </svg>
  );
}


export function Brand({ href = "#/home" }) {
  return (
    <a className="brand" href={href} aria-label="KinoLab Home">
      <img
        className="brand-logo-dark"
        src={`${import.meta.env.BASE_URL}assets/kinolab-logo.svg?v=20261110-2`}
        alt="KinoLab"
        width="180"
        height="65"
      />
      <img
        className="brand-logo-light"
        src={`${import.meta.env.BASE_URL}assets/kinolab-logo-dark.svg?v=20261110-2`}
        alt="KinoLab"
        width="180"
        height="65"
      />
    </a>
  );
}

