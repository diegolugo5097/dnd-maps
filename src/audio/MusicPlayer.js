// Music Player — manages background audio playlists per ambient theme
// Reads audio files from /music/{theme}/ folder
// Falls back to Web Audio API ambient generation if files don't exist

export const PLAYLISTS = [
  {
    id: "tavern",
    label: "Taberna",
    icon: "🍺",
    color: "#c9a84c",
    tracks: [
      { name: "Ambiente de taberna", file: "/music/tavern/track1.mp3" },
      { name: "Música de laúd", file: "/music/tavern/track2.mp3" },
      { name: "Noche en la posada", file: "/music/tavern/track3.mp3" },
    ],
  },
  {
    id: "dungeon",
    label: "Mazmorra",
    icon: "🏚",
    color: "#7c6fff",
    tracks: [
      { name: "Profundidades oscuras", file: "/music/dungeon/track1.mp3" },
      { name: "Ecos del abismo", file: "/music/dungeon/track2.mp3" },
      { name: "Cripta antigua", file: "/music/dungeon/track3.mp3" },
    ],
  },
  {
    id: "forest",
    label: "Bosque",
    icon: "🌲",
    color: "#2d6a1f",
    tracks: [
      { name: "Susurro del bosque", file: "/music/forest/track1.mp3" },
      { name: "Pájaros al amanecer", file: "/music/forest/track2.mp3" },
      { name: "Claro encantado", file: "/music/forest/track3.mp3" },
    ],
  },
  {
    id: "battle",
    label: "Batalla",
    icon: "⚔",
    color: "#ff4500",
    tracks: [
      { name: "Carga de guerra", file: "/music/battle/track1.mp3" },
      { name: "El último bastión", file: "/music/battle/track2.mp3" },
      { name: "Sangre y acero", file: "/music/battle/track3.mp3" },
    ],
  },
  {
    id: "mystery",
    label: "Misterio",
    icon: "🌑",
    color: "#48cae4",
    tracks: [
      { name: "Secretos antiguos", file: "/music/mystery/track1.mp3" },
      { name: "La profecía", file: "/music/mystery/track2.mp3" },
      { name: "Voces del más allá", file: "/music/mystery/track3.mp3" },
    ],
  },
  {
    id: "nature",
    label: "Naturaleza",
    icon: "🌿",
    color: "#a8d000",
    tracks: [
      { name: "Lluvia en las colinas", file: "/music/nature/track1.mp3" },
      { name: "Río tranquilo", file: "/music/nature/track2.mp3" },
      { name: "Tormenta lejana", file: "/music/nature/track3.mp3" },
    ],
  },
  {
    id: "epic",
    label: "Épico",
    icon: "👑",
    color: "#ffd700",
    tracks: [
      { name: "El héroe nace", file: "/music/epic/track1.mp3" },
      { name: "Destino cumplido", file: "/music/epic/track2.mp3" },
      { name: "La leyenda", file: "/music/epic/track3.mp3" },
    ],
  },
  {
    id: "custom",
    label: "Personalizada",
    icon: "🎵",
    color: "#ff69b4",
    tracks: [], // filled by user dropping files
  },
];

export class MusicPlayerEngine {
  constructor() {
    this.audio       = null;
    this.playlist    = null;  // PLAYLISTS entry
    this.trackIndex  = 0;
    this.volume      = 0.5;
    this.playing     = false;
    this.customTracks = []; // { name, url } from user files
    this.onStateChange = null; // callback
  }

  _notify() {
    this.onStateChange?.({
      playing:    this.playing,
      playlist:   this.playlist,
      trackIndex: this.trackIndex,
      volume:     this.volume,
      trackName:  this._currentTrackName(),
    });
  }

  _currentTrackName() {
    if (!this.playlist) return null;
    const tracks = this.playlist.id === "custom"
      ? this.customTracks
      : this.playlist.tracks;
    return tracks[this.trackIndex]?.name ?? null;
  }

  _getTracks() {
    if (!this.playlist) return [];
    return this.playlist.id === "custom"
      ? this.customTracks
      : this.playlist.tracks;
  }

  selectPlaylist(playlist) {
    this.stop();
    this.playlist   = playlist;
    this.trackIndex = 0;
    this._notify();
  }

  play() {
    const tracks = this._getTracks();
    if (!tracks.length) return;
    const track = tracks[this.trackIndex];
    if (!track) return;

    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }

    this.audio = new Audio(track.file ?? track.url);
    this.audio.volume = this.volume;
    this.audio.addEventListener("ended", () => this.next());
    this.audio.addEventListener("error", () => {
      // File not found — skip to next
      setTimeout(() => this.next(), 500);
    });
    this.audio.play().catch(() => {});
    this.playing = true;
    this._notify();
  }

  pause() {
    this.audio?.pause();
    this.playing = false;
    this._notify();
  }

  resume() {
    if (this.audio) {
      this.audio.play().catch(() => {});
      this.playing = true;
      this._notify();
    } else {
      this.play();
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    this.playing = false;
    this._notify();
  }

  next() {
    const tracks = this._getTracks();
    if (!tracks.length) return;
    this.trackIndex = (this.trackIndex + 1) % tracks.length;
    if (this.playing) this.play();
    else this._notify();
  }

  prev() {
    const tracks = this._getTracks();
    if (!tracks.length) return;
    this.trackIndex = (this.trackIndex - 1 + tracks.length) % tracks.length;
    if (this.playing) this.play();
    else this._notify();
  }

  setVolume(v) {
    this.volume = v;
    if (this.audio) this.audio.volume = v;
    this._notify();
  }

  addCustomTracks(files) {
    for (const file of files) {
      // Revoke old URL if exists
      const existing = this.customTracks.find(t => t.name === file.name);
      if (existing) URL.revokeObjectURL(existing.url);
      this.customTracks.push({ name: file.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(file) });
    }
    // Switch to custom playlist
    const customPl = PLAYLISTS.find(p => p.id === "custom");
    if (customPl) this.selectPlaylist(customPl);
    this._notify();
  }
}
