export function Icon({ name, className = 'h-5 w-5' }) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    viewBox: '0 0 24 24',
  }

  const icons = {
    home: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z"
      />
    ),
    spark: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Zm7 13 1 2.8L23 19l-3 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15ZM5 14l1.1 3L9 18.1 6.1 19 5 22l-1.1-3L1 18.1 3.9 17 5 14Z"
      />
    ),
    mic: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
      </>
    ),
    chart: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16v-5M12 16V8M17 16V4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
      </>
    ),
    doc: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h6l5 5v13a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    settings: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9.6 3 .5 2.3a7.8 7.8 0 0 1 3.8 0L14.4 3l2.2.7-.5 2.4a8 8 0 0 1 2.7 2.7l2.4-.5.7 2.2-2.3.5a7.8 7.8 0 0 1 0 3.8l2.3.5-.7 2.2-2.4-.5a8 8 0 0 1-2.7 2.7l.5 2.4-2.2.7-.5-2.3a7.8 7.8 0 0 1-3.8 0L9.6 21l-2.2-.7.5-2.4a8 8 0 0 1-2.7-2.7l-2.4.5-.7-2.2 2.3-.5a7.8 7.8 0 0 1 0-3.8L2 8.5l.7-2.2 2.4.5A8 8 0 0 1 7.8 4l-.5-2.3L9.6 3ZM12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"
      />
    ),
    arrow: <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 14 0M13 6l6 6-6 6" />,
    play: <path strokeLinecap="round" strokeLinejoin="round" d="m8 6 10 6-10 6V6Z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />,
    upload: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5-5 5 5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14" />
      </>
    ),
    moon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 15.4A8 8 0 1 1 8.6 4 6.5 6.5 0 0 0 20 15.4Z"
      />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </>
    ),
    download: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 10.5 4.5 4.5 4.5-4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h3" />
      </>
    ),
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A11.3 11.3 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-4.2 5.1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.2 6.2A18.3 18.3 0 0 0 2 12s3.5 7 10 7a11.9 11.9 0 0 0 4-.7" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
      </>
    ),
    logout: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 16l4-4-4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h9" />
      </>
    ),
    menu: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 17h16" />
      </>
    ),
    close: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18" />
      </>
    ),
    trash: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l1 13h8l1-13" />
      </>
    ),
    save: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h11l3 3v13H5V4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v6h8V4M9 20v-6h6v6" />
      </>
    ),
    camera: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h4l1.5-2h5L16 8h4v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    trophy: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6H4a2 2 0 0 0 2 4h1M18 6h2a2 2 0 0 1-2 4h-1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4M9 20h6M10 15h4" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    waves: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
      </>
    ),
  }

  return <svg {...common}>{icons[name]}</svg>
}
