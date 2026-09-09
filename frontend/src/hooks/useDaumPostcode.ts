import { useCallback, useEffect, useRef, useState } from 'react';

const POSTCODE_SCRIPT_URL =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

export interface PostcodeResult {
  postcode: string;
  addressLine1: string;
}

interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: 'R' | 'J';
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: () => void;
      }) => { open: () => void };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPostcodeScript(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${POSTCODE_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load postcode script')));
      return;
    }

    const script = document.createElement('script');
    script.src = POSTCODE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load postcode script'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function useDaumPostcode() {
  const [ready, setReady] = useState(Boolean(window.daum?.Postcode));
  const [loading, setLoading] = useState(false);
  const onCompleteRef = useRef<((result: PostcodeResult) => void) | null>(null);

  useEffect(() => {
    if (ready) return;
    loadPostcodeScript()
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [ready]);

  const openSearch = useCallback(
    (onComplete: (result: PostcodeResult) => void) => {
      onCompleteRef.current = onComplete;

      const launch = () => {
        if (!window.daum?.Postcode) return;
        new window.daum.Postcode({
          oncomplete: (data) => {
            const addressLine1 =
              data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
            onCompleteRef.current?.({
              postcode: data.zonecode,
              addressLine1,
            });
          },
        }).open();
      };

      if (window.daum?.Postcode) {
        launch();
        return;
      }

      setLoading(true);
      loadPostcodeScript()
        .then(() => {
          setReady(true);
          launch();
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  return { openSearch, ready, loading };
}
