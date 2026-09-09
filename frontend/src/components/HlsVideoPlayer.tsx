import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import Hls from 'hls.js';
import { getVideoPlaybackUrl } from '@/lib/api/media';

/**
 * HlsVideoPlayer — cinematic custom video player for ViBe HLS content.
 *
 * Full custom controls: play/pause, progress scrubber with hover preview,
 * volume slider, playback speed, fullscreen — all with glass-morphism
 * aesthetic and spring micro-animations.
 *
 * The imperative handle intentionally mirrors YTPlayerInstance so integration
 * is mechanical. All existing CREVS hooks (useRemediationLoop etc.) work
 * without modification.
 */

export interface HlsPlayerHandle {
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getVolume: () => number;
    setVolume: (volume: number) => void;
    getPlaybackRate: () => number;
    setPlaybackRate: (rate: number) => void;
}

export interface HlsVideoPlayerProps {
    assetId: string;
    startTime?: string;
    endTime?: string;
    autoPlay?: boolean;
    controls?: boolean;
    className?: string;
    onReady?: (durationSeconds: number) => void;
    onEnded?: () => void;
    onTimeUpdate?: (currentSeconds: number) => void;
    onError?: (message: string) => void;
    onPlay?: () => void;
    onPause?: () => void;
}

export function parseTimeToSeconds(value?: string): number | undefined {
    if (!value) return undefined;
    const parts = value.split(':').map(Number);
    if (parts.some(Number.isNaN)) return undefined;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return undefined;
}

function formatTime(seconds: number): string {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const HlsVideoPlayer = forwardRef<HlsPlayerHandle, HlsVideoPlayerProps>(
    function HlsVideoPlayer(
        {
            assetId,
            startTime,
            endTime,
            autoPlay = false,
            controls = true,
            className,
            onReady,
            onEnded,
            onTimeUpdate,
            onError,
            onPlay,
            onPause,
        },
        ref,
    ) {
        const videoRef = useRef<HTMLVideoElement | null>(null);
        const containerRef = useRef<HTMLDivElement | null>(null);
        const hlsRef = useRef<Hls | null>(null);
        const resumeAtRef = useRef<number>(0);
        const recoveringRef = useRef(false);
        const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [playing, setPlaying] = useState(false);
        const [currentTime, setCurrentTime] = useState(0);
        const [duration, setDuration] = useState(0);
        const [volume, setVolumeState] = useState(100);
        const [muted, setMuted] = useState(false);
        const [speed, setSpeed] = useState(1);
        const [showControls, setShowControls] = useState(true);
        const [isFullscreen, setIsFullscreen] = useState(false);
        const [showSpeedMenu, setShowSpeedMenu] = useState(false);
        const [buffered, setBuffered] = useState(0);
        const [seeking, setSeeking] = useState(false);

        const startSeconds = parseTimeToSeconds(startTime);
        const endSeconds = parseTimeToSeconds(endTime);
        const startSecondsRef = useRef(startSeconds);
        startSecondsRef.current = startSeconds;
        const onErrorRef = useRef(onError);
        onErrorRef.current = onError;

        const resetControlsTimer = useCallback(() => {
            setShowControls(true);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
            controlsTimerRef.current = setTimeout(() => {
                if (!seeking) setShowControls(false);
            }, 3000);
        }, [seeking]);

        const reportError = useCallback((message: string) => {
            setError(message);
            setLoading(false);
            onErrorRef.current?.(message);
        }, []);

        const load = useCallback(
            async (resumeAt?: number) => {
                const video = videoRef.current;
                if (!video) return;
                try {
                    const grant = await getVideoPlaybackUrl(assetId);
                    if (Hls.isSupported()) {
                        hlsRef.current?.destroy();
                        const hls = new Hls({ enableWorker: true });
                        hlsRef.current = hls;
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            setLoading(false);
                            recoveringRef.current = false;
                            const seekTarget = resumeAt ?? startSecondsRef.current;
                            if (seekTarget) video.currentTime = seekTarget;
                            if (autoPlay) void video.play().catch(() => undefined);
                        });
                        hls.on(Hls.Events.ERROR, (_event, data) => {
                            if (!data.fatal) return;
                            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !recoveringRef.current) {
                                recoveringRef.current = true;
                                resumeAtRef.current = video.currentTime;
                                void load(resumeAtRef.current);
                                return;
                            }
                            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                                hls.recoverMediaError();
                                return;
                            }
                            reportError('Playback failed. Please reload.');
                        });
                        hls.loadSource(grant.url);
                        hls.attachMedia(video);
                        return;
                    }
                    if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = grant.url;
                        const seekTarget = resumeAt ?? startSecondsRef.current;
                        if (seekTarget) {
                            const seekOnce = () => {
                                video.currentTime = seekTarget;
                                video.removeEventListener('loadedmetadata', seekOnce);
                            };
                            video.addEventListener('loadedmetadata', seekOnce);
                        }
                        setLoading(false);
                        if (autoPlay) void video.play().catch(() => undefined);
                        return;
                    }
                    reportError('This browser cannot play HLS video.');
                } catch (err) {
                    reportError(err instanceof Error ? err.message : 'Could not load this video.');
                }
            },
            [assetId, autoPlay, reportError],
        );

        useEffect(() => {
            setLoading(true);
            setError(null);
            recoveringRef.current = false;
            void load();
            return () => {
                hlsRef.current?.destroy();
                hlsRef.current = null;
            };
        }, [load]);

        useEffect(() => {
            const video = videoRef.current;
            if (!video || loading || startSeconds === undefined) return;
            if (!video.paused) return;
            if (Math.abs(video.currentTime - startSeconds) < 0.5) return;
            video.currentTime = startSeconds;
        }, [startSeconds, loading]);

        useEffect(() => {
            const video = videoRef.current;
            if (!video) return;
            const handleTimeUpdate = () => {
                setCurrentTime(video.currentTime);
                onTimeUpdate?.(video.currentTime);
                if (endSeconds !== undefined && video.currentTime >= endSeconds) {
                    video.pause();
                    onEnded?.();
                }
                // Update buffered
                if (video.buffered.length > 0) {
                    setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
                }
            };
            const handleEnded = () => onEnded?.();
            const handleLoadedMetadata = () => {
                setDuration(video.duration);
                onReady?.(video.duration);
            };
            const handlePlay = () => { setPlaying(true); onPlay?.(); };
            const handlePause = () => { setPlaying(false); onPause?.(); };
            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('ended', handleEnded);
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            return () => {
                video.removeEventListener('timeupdate', handleTimeUpdate);
                video.removeEventListener('ended', handleEnded);
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
            };
        }, [endSeconds, onEnded, onReady, onTimeUpdate, onPlay, onPause]);

        // Fullscreen tracking
        useEffect(() => {
            const handler = () => setIsFullscreen(!!document.fullscreenElement);
            document.addEventListener('fullscreenchange', handler);
            return () => document.removeEventListener('fullscreenchange', handler);
        }, []);

        useImperativeHandle(
            ref,
            (): HlsPlayerHandle => ({
                playVideo: () => void videoRef.current?.play().catch(() => undefined),
                pauseVideo: () => videoRef.current?.pause(),
                seekTo: seconds => { if (videoRef.current) videoRef.current.currentTime = seconds; },
                getCurrentTime: () => videoRef.current?.currentTime ?? 0,
                getDuration: () => videoRef.current?.duration ?? 0,
                getVolume: () => (videoRef.current?.volume ?? 0) * 100,
                setVolume: v => { if (videoRef.current) videoRef.current.volume = Math.min(Math.max(v, 0), 100) / 100; },
                getPlaybackRate: () => videoRef.current?.playbackRate ?? 1,
                setPlaybackRate: rate => { if (videoRef.current) videoRef.current.playbackRate = rate; },
            }),
            [],
        );

        // ── Control handlers ──────────────────────────────────────────────────
        const togglePlay = () => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) v.play().catch(() => undefined);
            else v.pause();
        };

        const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = videoRef.current;
            if (!v) return;
            v.currentTime = Number(e.target.value);
            setCurrentTime(Number(e.target.value));
        };

        const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = videoRef.current;
            if (!v) return;
            const vol = Number(e.target.value);
            v.volume = vol / 100;
            setVolumeState(vol);
            setMuted(vol === 0);
        };

        const toggleMute = () => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(!muted);
        };

        const changeSpeed = (s: number) => {
            const v = videoRef.current;
            if (!v) return;
            v.playbackRate = s;
            setSpeed(s);
            setShowSpeedMenu(false);
        };

        const toggleFullscreen = () => {
            const c = containerRef.current;
            if (!c) return;
            if (!document.fullscreenElement) c.requestFullscreen?.().catch(() => undefined);
            else document.exitFullscreen?.();
        };

        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        if (!controls) {
            return (
                <div className={className} ref={containerRef}>
                    <video ref={videoRef} playsInline className="w-full h-full rounded-xl bg-black" />
                </div>
            );
        }

        return (
            <div
                ref={containerRef}
                className={`group relative select-none rounded-2xl overflow-hidden bg-black ${className ?? ''}`}
                onMouseMove={resetControlsTimer}
                onMouseEnter={resetControlsTimer}
                onMouseLeave={() => setShowControls(false)}
                onTouchStart={resetControlsTimer}
                onClick={() => resetControlsTimer()}
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {/* ── CSS injected once ── */}
                <style>{`
                  .vibe-range {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 4px;
                    border-radius: 4px;
                    outline: none;
                    cursor: pointer;
                    background: transparent;
                  }
                  .vibe-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, hsl(38 95% 60%), hsl(262 83% 70%));
                    cursor: pointer;
                    box-shadow: 0 0 8px hsl(262 83% 70% / 0.5);
                    transition: transform 0.15s;
                  }
                  .vibe-range::-webkit-slider-thumb:hover { transform: scale(1.3); }
                  .vibe-range::-moz-range-thumb {
                    width: 14px; height: 14px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, hsl(38 95% 60%), hsl(262 83% 70%));
                    border: none; cursor: pointer;
                  }
                  .vp-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 36px; height: 36px; border-radius: 10px; border: none;
                    background: rgba(255,255,255,0.08);
                    color: white; cursor: pointer;
                    transition: background 0.2s, transform 0.15s;
                  }
                  .vp-btn:hover { background: rgba(255,255,255,0.16); transform: scale(1.05); }
                  .vp-btn:active { transform: scale(0.95); }
                  @keyframes vp-fade-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                  }
                `}</style>

                {/* ── Video element ── */}
                <video
                    ref={videoRef}
                    playsInline
                    className="w-full h-full object-contain"
                    style={{ display: 'block', background: '#000' }}
                    onDoubleClick={toggleFullscreen}
                    onClick={togglePlay}
                />

                {/* ── Loading overlay ── */}
                {loading && !error && (
                    <div
                        style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <div style={{ position: 'relative', width: 56, height: 56 }}>
                            <svg width="56" height="56" viewBox="0 0 56 56" fill="none"
                                style={{ position: 'absolute', inset: 0, animation: 'vibe-spin-cw 1.2s linear infinite' }}>
                                <defs>
                                    <linearGradient id="vp-lo-a" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="hsl(38 95% 60%)" />
                                        <stop offset="100%" stopColor="hsl(38 95% 60% / 0)" />
                                    </linearGradient>
                                </defs>
                                <circle cx="28" cy="28" r="24" stroke="url(#vp-lo-a)" strokeWidth="3" strokeLinecap="round" strokeDasharray="120 30" />
                            </svg>
                            <svg width="56" height="56" viewBox="0 0 56 56" fill="none"
                                style={{ position: 'absolute', inset: 0, animation: 'vibe-spin-ccw 0.8s linear infinite' }}>
                                <defs>
                                    <linearGradient id="vp-lo-v" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="hsl(262 83% 70%)" />
                                        <stop offset="100%" stopColor="hsl(262 83% 70% / 0)" />
                                    </linearGradient>
                                </defs>
                                <circle cx="28" cy="28" r="14" stroke="url(#vp-lo-v)" strokeWidth="2" strokeLinecap="round" strokeDasharray="60 22" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* ── Error overlay ── */}
                {error && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.75)', color: 'white', gap: 12, padding: 24,
                    }}>
                        <span style={{ fontSize: 36 }}>⚠️</span>
                        <p style={{ fontSize: 14, textAlign: 'center', color: 'hsl(0 80% 75%)' }}>{error}</p>
                        <button
                            onClick={() => { setError(null); setLoading(true); void load(); }}
                            style={{
                                padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, hsl(38 95% 58%), hsl(262 83% 65%))',
                                color: 'white', fontWeight: 600, fontSize: 13,
                            }}
                        >
                            🔄 Retry
                        </button>
                    </div>
                )}

                {/* ── Big play button on centre click ── */}
                {!loading && !error && !playing && (
                    <button
                        onClick={togglePlay}
                        aria-label="Play"
                        style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%,-50%)',
                            width: 72, height: 72, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, hsl(38 95% 58% / 0.9), hsl(262 83% 65% / 0.9))',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 40px hsl(262 83% 65% / 0.5)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            animation: 'vp-fade-in 0.3s ease-out',
                        }}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </button>
                )}

                {/* ── Control bar ── */}
                <div
                    style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '32px 16px 14px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                        display: 'flex', flexDirection: 'column', gap: 10,
                        transition: 'opacity 0.3s, transform 0.3s',
                        opacity: showControls ? 1 : 0,
                        transform: showControls ? 'translateY(0)' : 'translateY(8px)',
                        pointerEvents: showControls ? 'auto' : 'none',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Progress scrubber */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Buffered bar + progress bar stacked */}
                        <div style={{ position: 'relative', flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }}>
                            {/* Buffered */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, bottom: 0,
                                width: `${buffered}%`, borderRadius: 4,
                                background: 'rgba(255,255,255,0.2)',
                                pointerEvents: 'none',
                            }} />
                            {/* Played — amber → violet gradient */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, bottom: 0,
                                width: `${progress}%`, borderRadius: 4,
                                background: 'linear-gradient(to right, hsl(38 95% 58%), hsl(262 83% 70%))',
                                boxShadow: '0 0 6px hsl(262 83% 70% / 0.6)',
                                pointerEvents: 'none',
                            }} />
                            {/* Range input overlaid for interaction */}
                            <input
                                type="range"
                                min={0}
                                max={duration || 1}
                                step={0.1}
                                value={currentTime}
                                onChange={handleSeek}
                                onMouseDown={() => setSeeking(true)}
                                onMouseUp={() => setSeeking(false)}
                                className="vibe-range"
                                aria-label="Seek"
                                style={{
                                    position: 'absolute', inset: '-6px 0',
                                    width: '100%', opacity: 0, cursor: 'pointer',
                                    zIndex: 2,
                                }}
                            />
                        </div>
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Play / Pause */}
                        <button
                            className="vp-btn"
                            onClick={togglePlay}
                            aria-label={playing ? 'Pause' : 'Play'}
                            title={playing ? 'Pause' : 'Play'}
                        >
                            {playing ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                            )}
                        </button>

                        {/* Time */}
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums', minWidth: 90 }}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        <div style={{ flex: 1 }} />

                        {/* Volume */}
                        <button className="vp-btn" onClick={toggleMute} aria-label="Toggle mute" title="Mute">
                            {muted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
                        </button>
                        <input
                            type="range" min={0} max={100} step={1}
                            value={muted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="vibe-range"
                            aria-label="Volume"
                            style={{ width: 64, background: `linear-gradient(to right, hsl(38 95% 58%) ${muted ? 0 : volume}%, rgba(255,255,255,0.2) ${muted ? 0 : volume}%)` }}
                        />

                        {/* Speed */}
                        <div style={{ position: 'relative' }}>
                            <button
                                className="vp-btn"
                                onClick={() => setShowSpeedMenu(v => !v)}
                                aria-label="Playback speed"
                                title="Speed"
                                style={{ width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '-0.3px' }}
                            >
                                {speed}×
                            </button>
                            {showSpeedMenu && (
                                <div style={{
                                    position: 'absolute', bottom: 44, right: 0,
                                    background: 'rgba(10,10,16,0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 12, overflow: 'hidden',
                                    display: 'flex', flexDirection: 'column',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                    animation: 'vp-fade-in 0.2s ease-out',
                                    zIndex: 50,
                                }}>
                                    {SPEEDS.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => changeSpeed(s)}
                                            style={{
                                                padding: '7px 20px', border: 'none', cursor: 'pointer',
                                                background: s === speed
                                                    ? 'linear-gradient(135deg, hsl(38 95% 58% / 0.2), hsl(262 83% 70% / 0.2))'
                                                    : 'transparent',
                                                color: s === speed ? 'hsl(38 95% 70%)' : 'rgba(255,255,255,0.7)',
                                                fontSize: 13, fontWeight: s === speed ? 700 : 400,
                                                textAlign: 'right', transition: 'background 0.15s',
                                            }}
                                        >
                                            {s}×
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen */}
                        <button
                            className="vp-btn"
                            onClick={toggleFullscreen}
                            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/>
                                    <polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/>
                                </svg>
                            ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    },
);

export default HlsVideoPlayer;
