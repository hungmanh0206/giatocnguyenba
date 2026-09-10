'use client';

import { useEffect, useState } from 'react';
import { HeritageIcon } from './heritage-icon';

type FamilyMoment = {
  alt: string;
  caption: string;
  createdAt: string | null;
  height: number | null;
  id: string;
  src: string;
  width: number | null;
};

type FamilyMomentsResponse = {
  moments?: FamilyMoment[];
  status?: string;
};

function formatCapturedDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function FamilyMoments() {
  const [moments, setMoments] = useState<FamilyMoment[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMoments() {
      try {
        const response = await fetch('/api/family-moments', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;

        const data = (await response.json()) as FamilyMomentsResponse;
        if (data.status === 'ready' && data.moments?.length) {
          setMoments(data.moments);
        }
      } catch {
        // The section stays out of view until a photo library is available.
      } finally {
        if (!controller.signal.aborted) setIsReady(true);
      }
    }

    void loadMoments();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (isPaused || moments.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % moments.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [isPaused, moments.length]);

  function selectMoment(index: number) {
    setActiveIndex(index);
    setIsPaused(true);
  }

  if (!isReady || !moments.length) return null;

  const active = moments[activeIndex] || moments[0];
  const capturedDate = formatCapturedDate(active.createdAt);

  return (
    <section className="home-moments-band" aria-labelledby="family-moments-heading">
      <div className="container">
        <div className="family-moments">
          <div className="family-moments-heading">
            <div>
              <div className="eyebrow">NHỮNG KHOẢNH KHẮC ĐƯỢC GÌN GIỮ</div>
              <h2 id="family-moments-heading">Khoảnh khắc gia đình</h2>
            </div>
            <span className="family-moments-count" aria-live="polite">
              {String(activeIndex + 1).padStart(2, '0')} / {String(moments.length).padStart(2, '0')}
            </span>
          </div>

          <figure className="family-moment-stage">
            <img
              alt={active.alt}
              className="family-moment-image"
              key={active.id}
              src={active.src}
            />
            <figcaption className="family-moment-caption">
              <span>ALBUM GIA ĐÌNH</span>
              <strong>{active.caption}</strong>
              {capturedDate && <small>{capturedDate}</small>}
            </figcaption>
            {moments.length > 1 && (
              <>
                <div
                  aria-label="Điều khiển slideshow"
                  className="family-moment-controls"
                >
                  <button
                    aria-label="Ảnh trước"
                    className="family-moment-control"
                    onClick={() =>
                      selectMoment(
                        (activeIndex - 1 + moments.length) % moments.length,
                      )
                    }
                    title="Ảnh trước"
                    type="button"
                  >
                    <HeritageIcon name="previous" size={17} />
                  </button>
                  <button
                    aria-label={
                      isPaused
                        ? 'Tiếp tục slideshow'
                        : 'Tạm dừng slideshow'
                    }
                    className="family-moment-control"
                    onClick={() => setIsPaused((paused) => !paused)}
                    title={
                      isPaused
                        ? 'Tiếp tục slideshow'
                        : 'Tạm dừng slideshow'
                    }
                    type="button"
                  >
                    <HeritageIcon
                      name={isPaused ? 'resume' : 'pause'}
                      size={17}
                    />
                  </button>
                  <button
                    aria-label="Ảnh tiếp theo"
                    className="family-moment-control"
                    onClick={() =>
                      selectMoment((activeIndex + 1) % moments.length)
                    }
                    title="Ảnh tiếp theo"
                    type="button"
                  >
                    <HeritageIcon name="next" size={17} />
                  </button>
                </div>
                <div
                  aria-label="Chọn ảnh trong album"
                  className="family-moment-pagination"
                >
                  {moments.map((moment, index) => (
                    <button
                      aria-label={`Xem ảnh ${index + 1}: ${moment.caption}`}
                      aria-current={index === activeIndex ? 'true' : undefined}
                      className={index === activeIndex ? 'is-active' : ''}
                      key={moment.id}
                      onClick={() => selectMoment(index)}
                      type="button"
                    />
                  ))}
                </div>
              </>
            )}
          </figure>
        </div>
      </div>
    </section>
  );
}
