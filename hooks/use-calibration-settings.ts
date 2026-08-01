'use client';

import { useEffect, useState } from 'react';
import type { MicDetectorSettings } from '@/hooks/use-microphone-pitch';
import { loadProfile } from '@/lib/calibration/storage';
import {
  settingsFromProfile,
  type CalibrationProfile,
} from '@/lib/calibration/types';

/**
 * Detector overrides derived from the student's saved calibration profile.
 *
 * Read in an effect, not at render: the profile lives in localStorage and
 * every page here is prerendered, so touching storage during render would
 * desync the first client render from the static HTML.
 *
 * Returns an empty object when there is no profile, which leaves
 * `useMicrophonePitch` on its built-in defaults.
 */
export function useCalibrationSettings(): {
  settings: Partial<MicDetectorSettings>;
  profile: CalibrationProfile | null;
  isCalibrated: boolean;
} {
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  return {
    settings: settingsFromProfile(profile),
    profile,
    isCalibrated: profile !== null && profile.notes.length > 0,
  };
}
