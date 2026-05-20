import { useState, useEffect, useRef, useCallback } from "react";
import s from "./MusicPanel.module.css";

// ── YouTube IFrame API loader ─────────────────────────────────────────────────
function loadYTApi() {
  return new Promise(resolve => {
    if (window.YT?.Player) { resolve(); return; }
    const tag = document.createElement("script");
    tag.src   = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = resolve;
  });
}

function extractVideoId(url) {
  if (!url) return null;
  // youtu.be/ID  or  youtube.com/watch?v=ID  or  youtube.com/embed/ID
  const patterns = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/v\/([^?&\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── Playlist storage ──────────────────────────────────────────────────────────
const STORAGE_KEY = "dnd-music-playlists";

function loadPlaylists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePlaylists(pls) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pls)); } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MusicPanel() {
  const [open, setOpen]             = useState(false);
  const [playlists, setPlaylists]   = useState(() => loadPlaylists());
  const [activePl, setActivePl]     = useState(null);   // playlist index
  const [activeTrack, setActiveTrack] = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [volume, setVolume]         = useState(70);
  const [urlInput, setUrlInput]     = useState("");
  const [plName, setPlName]         = useState("");
  const [addingPl, setAddingPl]     = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const [trackUrl, setTrackUrl]     = useState("");
  const [trackName, setTrackName]   = useState("");

  const playerRef   = useRef(null);
  const playerDivId = "yt-player-hidden";
  const ytReady     = useRef(false);

  // Persist playlists
  useEffect(() => { savePlaylists(playlists); }, [playlists]);

  // Load YT API once
  useEffect(() => {
    loadYTApi().then(() => { ytReady.current = true; });
  }, []);

  const currentPl    = activePl !== null ? playlists[activePl] : null;
  const currentTrack = currentPl?.tracks?.[activeTrack] ?? null;

  // ── Player control ─────────────────────────────────────────────────────────

  const destroyPlayer = useCallback(() => {
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
  }, []);

  const playTrack = useCallback((vid) => {
    if (!vid || !ytReady.current) return;
    destroyPlayer();
    // Ensure hidden div exists
    let div = document.getElementById(playerDivId);
    if (!div) {
      div = document.createElement("div");
      div.id = playerDivId;
      div.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;";
      document.body.appendChild(div);
    }
    playerRef.current = new window.YT.Player(playerDivId, {
      videoId: vid,
      playerVars: { autoplay: 1, loop: 0, controls: 0 },
      events: {
        onReady: (e) => { e.target.setVolume(volume); e.target.playVideo(); setPlaying(true); },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) handleNext();
          if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
          if (e.data === window.YT.PlayerState.PAUSED)  setPlaying(false);
        },
        onError: () => handleNext(),
      },
    });
  }, [volume, destroyPlayer]);

  const handlePlay = useCallback((plIdx, trackIdx = 0) => {
    setActivePl(plIdx);
    setActiveTrack(trackIdx);
    const track = playlists[plIdx]?.tracks?.[trackIdx];
    if (track) playTrack(track.videoId);
  }, [playlists, playTrack]);

  const handleNext = useCallback(() => {
    if (activePl === null) return;
    const pl   = playlists[activePl];
    if (!pl?.tracks?.length) return;
    const next = (activeTrack + 1) % pl.tracks.length;
    setActiveTrack(next);
    playTrack(pl.tracks[next].videoId);
  }, [activePl, activeTrack, playlists, playTrack]);

  const handlePrev = useCallback(() => {
    if (activePl === null) return;
    const pl   = playlists[activePl];
    if (!pl?.tracks?.length) return;
    const prev = (activeTrack - 1 + pl.tracks.length) % pl.tracks.length;
    setActiveTrack(prev);
    playTrack(pl.tracks[prev].videoId);
  }, [activePl, activeTrack, playlists, playTrack]);

  const handlePauseResume = useCallback(() => {
    if (!playerRef.current) return;
    if (playing) { playerRef.current.pauseVideo(); setPlaying(false); }
    else         { playerRef.current.playVideo();  setPlaying(true);  }
  }, [playing]);

  const handleStop = useCallback(() => {
    destroyPlayer(); setPlaying(false);
  }, [destroyPlayer]);

  const handleVolume = useCallback((v) => {
    setVolume(v);
    playerRef.current?.setVolume(v);
  }, []);

  // ── Playlist management ────────────────────────────────────────────────────

  const handleCreatePlaylist = () => {
    if (!plName.trim()) return;
    const newPl = { name: plName.trim(), tracks: [] };
    setPlaylists(prev => [...prev, newPl]);
    setActivePl(playlists.length);
    setActiveTrack(0);
    setPlName(""); setAddingPl(false);
  };

  const handleAddTrack = () => {
    const vid = extractVideoId(trackUrl);
    if (!vid) { alert("URL de YouTube inválida"); return; }
    const name = trackName.trim() || `Pista ${(currentPl?.tracks?.length ?? 0) + 1}`;
    setPlaylists(prev => prev.map((pl, i) =>
      i === activePl
        ? { ...pl, tracks: [...pl.tracks, { name, videoId: vid, url: trackUrl }] }
        : pl
    ));
    setTrackUrl(""); setTrackName(""); setAddingTrack(false);
  };

  const handleDeleteTrack = (trackIdx) => {
    setPlaylists(prev => prev.map((pl, i) =>
      i === activePl
        ? { ...pl, tracks: pl.tracks.filter((_, ti) => ti !== trackIdx) }
        : pl
    ));
    if (activeTrack >= trackIdx) setActiveTrack(Math.max(0, activeTrack - 1));
  };

  const handleDeletePlaylist = (plIdx) => {
    if (activePl === plIdx) { handleStop(); setActivePl(null); setActiveTrack(0); }
    setPlaylists(prev => prev.filter((_, i) => i !== plIdx));
    if (activePl !== null && activePl > plIdx) setActivePl(activePl - 1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* FAB */}
      <button className={`${s.fab} ${playing ? s.fabPlaying : ""}`}
        onClick={() => setOpen(o => !o)} title="Música de fondo">
        {playing ? "♫" : "♪"}
      </button>

      {!open} 

      {open && (
        <div className={s.panel}>
          {/* Header */}
          <div className={s.header}>
            <span className={s.title}>🎵 Música de fondo</span>
            <button className={s.close} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={s.body}>

            {/* Player bar — shown when a track is active */}
            {currentTrack && (
              <div className={s.playerBar}>
                <div className={s.nowPlaying}>
                  <span className={s.nowName}>{currentTrack.name}</span>
                  <span className={s.nowPl}>{currentPl?.name}</span>
                </div>
                <div className={s.controls}>
                  <button className={s.ctrlBtn} onClick={handlePrev}>⏮</button>
                  <button className={`${s.ctrlBtn} ${s.ctrlPlay}`} onClick={handlePauseResume}>
                    {playing ? "⏸" : "▶"}
                  </button>
                  <button className={s.ctrlBtn} onClick={handleNext}>⏭</button>
                  <button className={s.ctrlBtn} onClick={handleStop}>⏹</button>
                </div>
                <div className={s.volRow}>
                  <span>🔈</span>
                  <input type="range" min="0" max="100" value={volume}
                    className={s.volSlider}
                    onChange={e => handleVolume(+e.target.value)} />
                  <span>🔊</span>
                </div>
              </div>
            )}

            {/* Playlist list */}
            <div className={s.plSection}>
              <div className={s.plHeader}>
                <span className={s.sectionLabel}>Playlists</span>
                <button className={s.addBtn} onClick={() => setAddingPl(v => !v)}>+ Nueva</button>
              </div>

              {/* New playlist form */}
              {addingPl && (
                <div className={s.inputRow}>
                  <input className={s.input} placeholder="Nombre de la playlist"
                    value={plName} onChange={e => setPlName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreatePlaylist()} />
                  <button className={s.confirmBtn} onClick={handleCreatePlaylist}>✓</button>
                  <button className={s.cancelBtn} onClick={() => setAddingPl(false)}>✕</button>
                </div>
              )}

              {playlists.length === 0 && (
                <p className={s.emptyHint}>Crea una playlist y agrega links de YouTube</p>
              )}

              {playlists.map((pl, pi) => (
                <div key={pi} className={`${s.plItem} ${activePl === pi ? s.plItemActive : ""}`}>
                  <button className={s.plName} onClick={() => setActivePl(pi)}>
                    🎵 {pl.name}
                    <span className={s.plCount}>{pl.tracks.length} pista(s)</span>
                  </button>
                  <button className={s.iconBtn} onClick={() => handleDeletePlaylist(pi)} title="Eliminar playlist">🗑</button>
                </div>
              ))}
            </div>

            {/* Track list of selected playlist */}
            {currentPl && (
              <div className={s.trackSection}>
                <div className={s.plHeader}>
                  <span className={s.sectionLabel}>{currentPl.name}</span>
                  <button className={s.addBtn} onClick={() => setAddingTrack(v => !v)}>+ Link YT</button>
                </div>

                {/* Add track form */}
                {addingTrack && (
                  <div className={s.addTrackForm}>
                    <input className={s.input} placeholder="URL de YouTube"
                      value={trackUrl} onChange={e => setTrackUrl(e.target.value)} />
                    <input className={s.input} placeholder="Nombre (opcional)"
                      value={trackName} onChange={e => setTrackName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddTrack()} />
                    <div className={s.inputRow}>
                      <button className={s.confirmBtn} style={{flex:1}} onClick={handleAddTrack}>Agregar pista</button>
                      <button className={s.cancelBtn} onClick={() => setAddingTrack(false)}>✕</button>
                    </div>
                  </div>
                )}

                {currentPl.tracks.length === 0 && (
                  <p className={s.emptyHint}>Agrega links de YouTube con "+ Link YT"</p>
                )}

                {currentPl.tracks.map((t, ti) => (
                  <div key={ti}
                    className={`${s.trackItem} ${activePl !== null && activeTrack === ti && activePl === playlists.indexOf(currentPl) ? s.trackItemActive : ""}`}>
                    <button className={s.trackPlay}
                      onClick={() => handlePlay(playlists.indexOf(currentPl), ti)}>
                      {activeTrack === ti && playing && activePl === playlists.indexOf(currentPl) ? "♫" : "▶"}
                    </button>
                    <span className={s.trackName}>{t.name}</span>
                    <a href={t.url} target="_blank" rel="noreferrer" className={s.iconBtn} title="Abrir en YouTube">↗</a>
                    <button className={s.iconBtn} onClick={() => handleDeleteTrack(ti)} title="Eliminar">🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
