import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { EDITORIAL_EASE, useButtonRipple } from '../components/MotionPrimitives';

type AuthTab = 'login' | 'register';
type SubmitPhase = 'idle' | 'loading' | 'success';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FloatingUnderlineInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  error?: string | null;
  errorTick?: number;
  rightAdornment?: React.ReactNode;
}

const FloatingUnderlineInput: React.FC<FloatingUnderlineInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  error,
  errorTick = 0,
  rightAdornment,
}) => {
  return (
    <div>
      <div className="relative pt-5">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder=" "
          className={`peer w-full border-0 border-b ${
            error
              ? 'border-[#7D332B]'
              : 'border-[var(--color-border-strong)]'
          } bg-transparent px-0 py-2 ${
            rightAdornment ? 'pr-10' : ''
          } text-sm text-[var(--color-ink)] placeholder-transparent focus:border-transparent focus:shadow-[0_6px_14px_-8px_rgba(30,59,47,0.28)] focus:outline-none transition-all duration-200`}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-0 top-0.5 text-[11px] font-medium tracking-wide transition-all duration-200 peer-placeholder-shown:top-7 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-focus:top-0.5 peer-focus:text-[11px] peer-focus:font-medium peer-focus:tracking-wide ${
            error
              ? 'text-[#7D332B] peer-focus:text-[#7D332B]'
              : 'text-[var(--color-ink-subtle)] peer-focus:text-[#1E3B2F]'
          }`}
        >
          {label}
        </label>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[1.5px] ${
            error ? 'bg-[#7D332B]' : 'bg-[#1E3B2F]'
          } origin-center scale-x-0 peer-focus:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
        />
        {rightAdornment ? (
          <div className="absolute right-0 bottom-1.5">{rightAdornment}</div>
        ) : null}
      </div>
      {error ? (
        <p
          key={`${id}-err-${errorTick}`}
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-[#7D332B] animate-shake-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const validateEmail = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return 'Email address is required.';
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address.';
  return null;
};

const validatePassword = (value: string): string | null => {
  if (!value || value.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
};

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const { notify } = useToast();
  const prefersReduced = useReducedMotion();
  const { ripples, triggerRipple } = useButtonRipple();

  const [tab, setTab] = useState<AuthTab>('login');

  // Sign-In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // Inline validation & auth errors
  const [loginEmailError, setLoginEmailError] = useState<string | null>(null);
  const [loginPasswordError, setLoginPasswordError] = useState<string | null>(
    null
  );
  const [regEmailError, setRegEmailError] = useState<string | null>(null);
  const [regPasswordError, setRegPasswordError] = useState<string | null>(null);
  const [regConfirmError, setRegConfirmError] = useState<string | null>(null);

  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);

  const submitting = submitPhase !== 'idle';

  const bumpErrorTick = () => setErrorTick((n) => n + 1);

  const clearErrors = () => {
    setAuthError(null);
    setLoginEmailError(null);
    setLoginPasswordError(null);
    setRegEmailError(null);
    setRegPasswordError(null);
    setRegConfirmError(null);
  };

  const handleSwitchTab = (next: AuthTab) => {
    if (submitting) return;
    setTab(next);
    clearErrors();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const emailErr = validateEmail(loginEmail);
    const passErr = validatePassword(loginPassword);
    setLoginEmailError(emailErr);
    setLoginPasswordError(passErr);

    if (emailErr || passErr) {
      bumpErrorTick();
      return;
    }

    const startedAt = performance.now();
    setSubmitPhase('loading');
    try {
      await login(loginEmail.trim(), loginPassword, rememberMe, async () => {
        if (!prefersReduced) {
          const elapsed = performance.now() - startedAt;
          const remaining = Math.max(0, 1000 - elapsed);
          if (remaining > 0) await sleep(remaining);
          setSubmitPhase('success');
          await sleep(320);
        }
      });
      notify('Welcome back to Monvera.', 'success');
    } catch (err) {
      setSubmitPhase('idle');
      setAuthError(
        err instanceof Error ? err.message : 'Incorrect email or password'
      );
      bumpErrorTick();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const emailErr = validateEmail(regEmail);
    const passErr = validatePassword(regPassword);
    const confirmErr =
      regPassword !== regConfirm ? 'Passwords do not match.' : null;

    setRegEmailError(emailErr);
    setRegPasswordError(passErr);
    setRegConfirmError(confirmErr);

    if (emailErr || passErr || confirmErr) {
      bumpErrorTick();
      return;
    }

    const startedAt = performance.now();
    setSubmitPhase('loading');
    try {
      await register(
        {
          email: regEmail.trim(),
          password: regPassword,
          remember: rememberMe,
        },
        async () => {
          if (!prefersReduced) {
            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(0, 1000 - elapsed);
            if (remaining > 0) await sleep(remaining);
            setSubmitPhase('success');
            await sleep(320);
          }
        }
      );
      notify('Account created and workspace unlocked.', 'success');
    } catch (err) {
      setSubmitPhase('idle');
      const message =
        err instanceof Error ? err.message : 'Unable to create account.';
      if (message.toLowerCase().includes('already exists')) {
        setRegEmailError(message);
      } else {
        setAuthError(message);
      }
      bumpErrorTick();
    }
  };

  const brandLetters = 'Monvera'.split('');

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden">
      {/* Left Edge-to-Edge Full-Height Pitcher Photo Panel (Short header banner on mobile) */}
      <aside className="group relative lg:col-span-5 xl:col-span-6 h-64 sm:h-72 lg:h-auto lg:min-h-screen bg-[#1E3B2F] overflow-hidden">
        {/* Load zoom-out + continuous Ken Burns drift + gentle hover zoom */}
        <motion.div
          initial={prefersReduced ? false : { scale: 1.08, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: EDITORIAL_EASE }}
          className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
        >
          <img
            src="/src/assets/images/product_stoneware_carafe_1794584332131.jpg"
            alt="Hand-thrown speckled stoneware carafe"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center animate-ken-burns"
          />
        </motion.div>

        {/* Measured Forest-Green Editorial Scrims for Legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#152B22]/85 via-[#1E3B2F]/25 to-[#152B22]/90"
        />

        <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-10 lg:p-14 text-[#F5F0E6]">
          {/* Top Brand Mark & Tagline */}
          <div className="space-y-4">
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: EDITORIAL_EASE }}
              className="inline-flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1E3B2F]/80 border border-[#C8B48A]/50 flex items-center justify-center font-serif text-sm font-semibold text-[#F5F0E6] shadow-[0_4px_12px_rgba(21,43,34,0.35)]">
                M
              </div>
              <span className="text-[11px] tracking-[0.18em] uppercase text-[#C8B48A]">
                Enterprise Atelier
              </span>
            </motion.div>

            <div className="space-y-2 max-w-md">
              <h1
                aria-label="Monvera"
                className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.08] text-[#F5F0E6] flex flex-wrap"
              >
                {brandLetters.map((char, idx) => (
                  <motion.span
                    key={`${char}-${idx}`}
                    initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.45,
                      delay: 0.14 + idx * 0.045,
                      ease: EDITORIAL_EASE,
                    }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28, ease: EDITORIAL_EASE }}
                className="hidden sm:block text-sm text-[#F5F0E6]/85 leading-relaxed max-w-sm"
              >
                A quiet, architectural workspace for managing studio inventory,
                client commissions, and financial performance.
              </motion.p>
            </div>
          </div>

          {/* Bottom Caption Over Photo */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36, ease: EDITORIAL_EASE }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#C8B48A]">
                Private Ledger Access
              </p>
              <p className="text-xs sm:text-sm text-[#F5F0E6]/90">
                Overview · Products · Orders · Customers
              </p>
            </div>

            <div className="hidden lg:flex pt-4 border-t border-white/15 items-center justify-between text-xs text-[#F5F0E6]/70">
              <span>Editorial Enterprise Suite</span>
              <span className="font-mono text-[#C8B48A]">2026</span>
            </div>
          </motion.div>
        </div>
      </aside>

      {/* Right Clean White Form Panel Floating on Cream Canvas */}
      <main className="relative lg:col-span-7 xl:col-span-6 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-[var(--color-cream)] overflow-hidden">
        {/* Subtle ambient palette-tinted background drift */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#C8B48A]/18 blur-3xl animate-ambient-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-[#7F8C6A]/14 blur-3xl animate-ambient-drift"
          style={{ animationDelay: '-9s' }}
        />

        <motion.section
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EDITORIAL_EASE }}
          className="relative z-10 w-full max-w-[460px] bg-[var(--color-surface-white)] border border-[var(--color-border)] rounded-md p-7 sm:p-10"
        >
          {/* Underlined Text Tab Switcher with Smooth Sliding Active Indicator */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: EDITORIAL_EASE }}
            role="tablist"
            aria-label="Authentication mode"
            className="flex items-center gap-4 border-b border-[var(--color-border)] pb-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => handleSwitchTab('login')}
              className={`btn-soft relative px-3.5 py-2 rounded-[5px] text-sm font-medium whitespace-nowrap shrink-0 ${
                tab === 'login'
                  ? 'text-[#1E3B2F] bg-[var(--color-surface-cream)]'
                  : 'text-[var(--color-ink-subtle)] bg-white hover:text-[var(--color-ink)]'
              }`}
            >
              Sign In
              {tab === 'login' ? (
                <motion.span
                  layoutId="login-active-tab"
                  transition={{ duration: 0.3, ease: EDITORIAL_EASE }}
                  aria-hidden="true"
                  className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-[#1E3B2F]"
                />
              ) : null}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              onClick={() => handleSwitchTab('register')}
              className={`btn-soft relative px-3.5 py-2 rounded-[5px] text-sm font-medium whitespace-nowrap shrink-0 ${
                tab === 'register'
                  ? 'text-[#1E3B2F] bg-[var(--color-surface-cream)]'
                  : 'text-[var(--color-ink-subtle)] bg-white hover:text-[var(--color-ink)]'
              }`}
            >
              Create Account
              {tab === 'register' ? (
                <motion.span
                  layoutId="login-active-tab"
                  transition={{ duration: 0.3, ease: EDITORIAL_EASE }}
                  aria-hidden="true"
                  className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-[#1E3B2F]"
                />
              ) : null}
            </button>
          </motion.div>

          {/* Editorial Heading */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease: EDITORIAL_EASE }}
            className="mt-7 mb-6"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
              >
                <h2 className="font-serif text-3xl font-medium text-[var(--color-forest)]">
                  {tab === 'login'
                    ? 'Sign in to your ledger'
                    : 'Create staff account'}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  {tab === 'login'
                    ? 'Enter your credentials to access your studio operations.'
                    : 'Create an account to begin managing catalog and order records.'}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {authError ? (
            <div
              key={errorTick}
              role="alert"
              className="mb-6 px-4 py-3 rounded-md bg-[#FDF8F7] border border-[#D9B6B1] text-xs font-medium text-[#7D332B] animate-shake-error"
            >
              {authError}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="form-login"
                noValidate
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EDITORIAL_EASE }}
                onSubmit={handleLoginSubmit}
                className="space-y-6"
              >
                <motion.div
                  initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.22, ease: EDITORIAL_EASE }}
                  className="space-y-4"
                >
                  <FloatingUnderlineInput
                    id="login-email"
                    label="Email Address"
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    error={loginEmailError}
                    errorTick={errorTick}
                    onChange={(val) => {
                      setLoginEmail(val);
                      if (loginEmailError) setLoginEmailError(null);
                      if (authError) setAuthError(null);
                    }}
                  />

                  <FloatingUnderlineInput
                    id="login-password"
                    label="Password"
                    type={showLoginPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPassword}
                    error={loginPasswordError}
                    errorTick={errorTick}
                    onChange={(val) => {
                      setLoginPassword(val);
                      if (loginPasswordError) setLoginPasswordError(null);
                      if (authError) setAuthError(null);
                    }}
                    rightAdornment={
                      <motion.button
                        type="button"
                        onClick={() => setShowLoginPass((v) => !v)}
                        whileTap={prefersReduced ? undefined : { scale: 0.9, rotate: 12 }}
                        aria-label={
                          showLoginPass ? 'Hide password' : 'Show password'
                        }
                        className="btn-soft p-1.5 rounded bg-white text-[var(--color-ink-subtle)] hover:text-[var(--color-forest)]"
                      >
                        <motion.span
                          key={showLoginPass ? 'eye-off' : 'eye'}
                          initial={prefersReduced ? false : { scale: 0.75, rotate: -14, opacity: 0.5 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                          className="block"
                        >
                          {showLoginPass ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </motion.span>
                      </motion.button>
                    }
                  />
                </motion.div>

                {/* Keep me signed in row */}
                <motion.div
                  initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.28, ease: EDITORIAL_EASE }}
                  className="flex items-center justify-between pt-1"
                >
                  <label className="group inline-flex items-center gap-2.5 text-xs text-[var(--color-ink-muted)] cursor-pointer select-none">
                    <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-[3px] border border-[var(--color-border-strong)] bg-white transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgba(30,59,47,0.2)]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`absolute inset-0 rounded-[2px] transition-colors duration-200 ${
                          rememberMe ? 'bg-[#1E3B2F]' : 'bg-white'
                        }`}
                      />
                      <svg
                        viewBox="0 0 12 10"
                        fill="none"
                        aria-hidden="true"
                        className="relative z-10 w-2.5 h-2.5"
                      >
                        <motion.path
                          d="M1.5 5.2L4.4 8.1L10.5 1.8"
                          stroke="#F5F0E6"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={false}
                          animate={{
                            pathLength: rememberMe ? 1 : 0,
                            opacity: rememberMe ? 1 : 0,
                          }}
                          transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
                        />
                      </svg>
                    </span>
                    <span>Keep me signed in</span>
                  </label>
                </motion.div>

                {/* Full-Width Sign In Button with Ripple, Shimmer, Arrow Slide, Spinner & Checkmark */}
                <motion.div
                  initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.34, ease: EDITORIAL_EASE }}
                >
                  <button
                    type="submit"
                    disabled={submitting}
                    onClick={triggerRipple}
                    className="btn-forest btn-shimmer group w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[4px] text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] disabled:opacity-90 disabled:cursor-wait"
                  >
                    {ripples.map((r) => (
                      <span
                        key={r.id}
                        aria-hidden="true"
                        className="ripple-dot"
                        style={{
                          left: r.x,
                          top: r.y,
                          width: r.size,
                          height: r.size,
                        }}
                      />
                    ))}
                    {submitPhase === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin-smooth" />
                        <span>Signing in...</span>
                      </>
                    ) : submitPhase === 'success' ? (
                      <>
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
                          className="inline-flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-[#C8B48A]" strokeWidth={2.5} />
                        </motion.span>
                        <span>Ledger unlocked</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </motion.div>
              </motion.form>
            ) : (
              <motion.form
                key="form-register"
                noValidate
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EDITORIAL_EASE }}
                onSubmit={handleRegisterSubmit}
                className="space-y-5"
              >
                <FloatingUnderlineInput
                  id="reg-email"
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  error={regEmailError}
                  errorTick={errorTick}
                  onChange={(val) => {
                    setRegEmail(val);
                    if (regEmailError) setRegEmailError(null);
                    if (authError) setAuthError(null);
                  }}
                />

                <FloatingUnderlineInput
                  id="reg-password"
                  label="Password"
                  type={showRegPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={regPassword}
                  error={regPasswordError}
                  errorTick={errorTick}
                  onChange={(val) => {
                    setRegPassword(val);
                    if (regPasswordError) setRegPasswordError(null);
                    if (regConfirmError) setRegConfirmError(null);
                  }}
                  rightAdornment={
                    <motion.button
                      type="button"
                      onClick={() => setShowRegPass((v) => !v)}
                      whileTap={prefersReduced ? undefined : { scale: 0.9, rotate: 12 }}
                      aria-label={
                        showRegPass ? 'Hide password' : 'Show password'
                      }
                      className="btn-soft p-1.5 rounded bg-white text-[var(--color-ink-subtle)] hover:text-[var(--color-forest)]"
                    >
                      <motion.span
                        key={showRegPass ? 'reg-eye-off' : 'reg-eye'}
                        initial={prefersReduced ? false : { scale: 0.75, rotate: -14, opacity: 0.5 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                        className="block"
                      >
                        {showRegPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </motion.span>
                    </motion.button>
                  }
                />

                <FloatingUnderlineInput
                  id="reg-confirm"
                  label="Confirm Password"
                  type={showRegPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={regConfirm}
                  error={regConfirmError}
                  errorTick={errorTick}
                  onChange={(val) => {
                    setRegConfirm(val);
                    if (regConfirmError) setRegConfirmError(null);
                  }}
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="group inline-flex items-center gap-2.5 text-xs text-[var(--color-ink-muted)] cursor-pointer select-none">
                    <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-[3px] border border-[var(--color-border-strong)] bg-white transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgba(30,59,47,0.2)]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`absolute inset-0 rounded-[2px] transition-colors duration-200 ${
                          rememberMe ? 'bg-[#1E3B2F]' : 'bg-white'
                        }`}
                      />
                      <svg
                        viewBox="0 0 12 10"
                        fill="none"
                        aria-hidden="true"
                        className="relative z-10 w-2.5 h-2.5"
                      >
                        <motion.path
                          d="M1.5 5.2L4.4 8.1L10.5 1.8"
                          stroke="#F5F0E6"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={false}
                          animate={{
                            pathLength: rememberMe ? 1 : 0,
                            opacity: rememberMe ? 1 : 0,
                          }}
                          transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
                        />
                      </svg>
                    </span>
                    <span>Keep me signed in</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  onClick={triggerRipple}
                  className="btn-forest btn-shimmer group w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[4px] text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] disabled:opacity-90 disabled:cursor-wait mt-2"
                >
                  {ripples.map((r) => (
                    <span
                      key={r.id}
                      aria-hidden="true"
                      className="ripple-dot"
                      style={{
                        left: r.x,
                        top: r.y,
                        width: r.size,
                        height: r.size,
                      }}
                    />
                  ))}
                  {submitPhase === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin-smooth" />
                      <span>Creating account...</span>
                    </>
                  ) : submitPhase === 'success' ? (
                    <>
                      <Check className="w-4 h-4 text-[#C8B48A]" strokeWidth={2.5} />
                      <span>Workspace ready</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>
      </main>
    </div>
  );
};
