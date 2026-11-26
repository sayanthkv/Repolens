import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Link from '@/lib/router';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { RepoLensLogo } from '@/components/repolens-logo';
import { HeroWireframeCanvas } from '@/components/hero-wireframe-canvas';
import { CodeCube3D } from '@/components/code-cube-3d';
import {
  GeodesicOrbSvg,
  TorusMeshSvg,
  LatitudeOrbSvg,
  CyberSilhouetteSvg,
} from '@/components/wireframe-art';
import { useToast } from '@/components/ui/toast';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

gsap.registerPlugin(ScrollTrigger);

const PARTNER_LOGOS = [
  'OneDrive',
  'Dropbox',
  'MEGA',
  'box',
  'PayPal',
  'Walmart',
  'Tencent Cloud',
  'DigitalOcean',
  'Microsoft Azure',
];

const STATEMENT_TEXT =
  "We've helped businesses eliminate critical vulnerabilities, respond to breaches in record time, and achieve full regulatory compliance — delivering precise, high-impact security solutions where they matter most.";

const CHALLENGES = [
  {
    title: 'Undetected Vulnerabilities',
    description:
      'Automated scans and generic security miss deep, exploitable weaknesses, making your critical assets an easy target.',
    orb: 'geodesic' as const,
  },
  {
    title: 'Slow Incident Response',
    description:
      'Without rapid containment, attackers can escalate breaches—leading to data loss, financial damage, and reputational harm.',
    orb: 'latitude' as const,
  },
  {
    title: 'Regulatory Gaps',
    description:
      'Incomplete compliance with PCI-DSS, HIPAA, or GDPR can result in audits, legal penalties, and operational shutdowns.',
    orb: 'torus' as const,
  },
];

const TESTIMONIALS = [
  {
    author: 'Adam Driver · CSO, Dynamics24 · Feb 3',
    quote:
      'CyFocus delivered expert security solutions that protected our digital assets and kept our business running without disruption. Their proactive approach and actionable insights not only strengthened our defenses but also gave us the confidence to scale securely.',
  },
  {
    author: 'Elena Vance · VP Engineering, Meridian · Jan 18',
    quote:
      'From leaked credential sweeps to real-time PR security comments, their automated workflows cut our vulnerability triage overhead by more than half.',
  },
  {
    author: 'Marcus Chen · Head of Platform, Vektor · Dec 12',
    quote:
      'Having CycloneDX SBOM exports and plain-English remediation PRs in one workspace turned compliance audits from a week-long scramble into a routine check.',
  },
];

const SERVICES = [
  {
    id: '01',
    headline: 'Expose Vulnerabilities Before They Become Breaches.',
    title: 'Penetration Testing',
    bullets: [
      {
        lead: 'Thorough Evaluations:',
        desc: 'Assessments of networks and infrastructures to uncover weaknesses.',
      },
      {
        lead: 'Realistic Attack Simulations:',
        desc: 'Mimic current cyber threats to rigorously test and validate defenses.',
      },
      {
        lead: 'Practical Remediation:',
        desc: 'Provide clear, prioritized guidance to effectively mitigate discovered risks.',
      },
    ],
  },
  {
    id: '02',
    headline: 'Swiftly Contain And Analyze Security Incidents.',
    title: 'Incident Response & Digital Forensics',
    bullets: [
      {
        lead: 'Rapid Containment:',
        desc: 'Instantly identify and isolate breaches to minimize operational impact.',
      },
      {
        lead: 'Deep Forensic Analysis:',
        desc: 'Investigate incidents to map attack vectors and determine root causes.',
      },
      {
        lead: 'Strategic Recovery:',
        desc: 'Develop actionable plans for system restoration and enhanced future protection.',
      },
    ],
  },
  {
    id: '03',
    headline: 'Ensure Robust Security While Meeting Regulatory Standards.',
    title: 'Compliance Security Assessments',
    bullets: [
      {
        lead: 'Regulatory Benchmarking:',
        desc: 'Internal controls against standards like PCI-DSS, HIPAA, etc.',
      },
      {
        lead: 'Customized Action Plans:',
        desc: 'Craft step-by-step strategies to achieve and sustain full compliance.',
      },
      {
        lead: 'Clear, Insightful Reporting:',
        desc: 'Deliver concise reports that bridge technical details and clarity.',
      },
    ],
  },
];

function CodeWindow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`border border-white/15 bg-[#3A0B02]/95 p-4 shadow-2xl ${className}`}
    >
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D12404]" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8F91]">
          auth_guard.py
        </span>
      </div>
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-[#F4F4F4]">
        <code>
          <span className="text-[#8A8F91]">import</span> bcrypt{'\n'}
          <span className="text-[#8A8F91]">def</span>{' '}
          <span className="bg-[#D12404]/45 px-1 text-white">hash_password</span>(password):{'\n'}
          {'  '}salt = bcrypt.gensalt(){'\n'}
          {'  '}return bcrypt.hashpw(password.encode(), salt){'\n\n'}
          <span className="text-[#8A8F91]">def</span>{' '}
          <span className="bg-[#D12404]/45 px-1 text-white">check_password</span>(password, hashed):{'\n'}
          {'  '}return bcrypt.checkpw(password.encode(), hashed)
        </code>
      </pre>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [navOnRed, setNavOnRed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [activeServiceIdx, setActiveServiceIdx] = useState(0);
  const [serviceMorph, setServiceMorph] = useState(0);
  const [serviceProgress, setServiceProgress] = useState(0.33);

  // Contact multi-step state
  const [trialFor, setTrialFor] = useState<'own' | 'client'>('own');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroCodeRef = useRef<HTMLDivElement | null>(null);
  const heroCtaRef = useRef<HTMLDivElement | null>(null);
  const heroParaRef = useRef<HTMLParagraphElement | null>(null);
  const statementRef = useRef<HTMLElement | null>(null);
  const challengesGridRef = useRef<HTMLDivElement | null>(null);
  const cursorRingRef = useRef<HTMLDivElement | null>(null);
  const testimonialSectionRef = useRef<HTMLElement | null>(null);
  const testimonialRedBoxRef = useRef<HTMLDivElement | null>(null);
  const servicesSectionRef = useRef<HTMLElement | null>(null);
  const servicesBorderRef = useRef<HTMLDivElement | null>(null);
  const contactCurveRef = useRef<SVGPathElement | null>(null);

  const isContactValid =
    fullName.trim().length >= 2 && companyName.trim().length >= 2 && acceptedTerms;

  // GSAP + ScrollTrigger + Lenis orchestration
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.innerWidth >= 900;

    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;

    if (!prefersReduced) {
      lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      tickerFn = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      // 3.2 Hero load sequence (slow, deliberate entrance)
      if (!prefersReduced) {
        const tl = gsap.timeline();
        if (heroCodeRef.current) {
          tl.fromTo(
            heroCodeRef.current,
            { x: 28, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.05, ease: 'power3.out' },
            0.35,
          );
        }
        const h1Lines = rootRef.current?.querySelectorAll('.hero-h1-line');
        if (h1Lines && h1Lines.length > 0) {
          tl.fromTo(
            h1Lines,
            { yPercent: 100, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 1.15, stagger: 0.2, ease: 'power3.out' },
            0.45,
          );
        }
        if (heroCtaRef.current) {
          tl.fromTo(
            heroCtaRef.current,
            { y: 18, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' },
            0.85,
          );
        }
        if (heroParaRef.current) {
          tl.fromTo(
            heroParaRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1.0, ease: 'power2.out' },
            0.95,
          );
        }

        // 3.5 Statement character-by-character scroll scrub
        const chars = statementRef.current?.querySelectorAll('.stmt-char');
        if (chars && chars.length > 0) {
          gsap.to(chars, {
            color: '#FFFFFF',
            stagger: 0.02,
            ease: 'none',
            scrollTrigger: {
              trigger: statementRef.current,
              start: 'top 80%',
              end: 'bottom 40%',
              scrub: true,
            },
          });
        }

        // 3.7 Testimonial clip-path expansion (desktop pinned)
        if (isDesktop && testimonialSectionRef.current && testimonialRedBoxRef.current) {
          gsap.fromTo(
            testimonialRedBoxRef.current,
            { clipPath: 'inset(0% 0% 0% 68%)' },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              ease: 'power3.out',
              scrollTrigger: {
                trigger: testimonialSectionRef.current,
                start: 'top top',
                end: '+=90%',
                pin: true,
                scrub: 0.6,
              },
            },
          );
        }

        // 3.8 Services pinned & scrubbed (desktop >= 900px)
        if (isDesktop && servicesSectionRef.current) {
          ScrollTrigger.create({
            trigger: servicesSectionRef.current,
            start: 'top 10%',
            end: '+=180%',
            pin: true,
            scrub: true,
            onUpdate: (self) => {
              const p = self.progress;
              setServiceProgress(Math.max(0.08, p));
              setServiceMorph(p * 2);
              if (p < 0.34) setActiveServiceIdx(0);
              else if (p < 0.68) setActiveServiceIdx(1);
              else setActiveServiceIdx(2);

              if (servicesBorderRef.current) {
                servicesBorderRef.current.style.clipPath = `inset(0 ${Math.max(0, 100 - p * 100)}% 0 0)`;
              }
            },
          });
        }

        // 3.9 Contact SVG self-drawing curved path
        if (contactCurveRef.current) {
          const len = contactCurveRef.current.getTotalLength();
          gsap.set(contactCurveRef.current, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(contactCurveRef.current, {
            strokeDashoffset: 0,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
          });
        }
      }
    }, rootRef);

    // 3.6 CursorRing inside Challenge cards grid (desktop >= 900px)
    let removeCursorListeners = () => {};
    if (!prefersReduced && isDesktop && challengesGridRef.current && cursorRingRef.current) {
      const grid = challengesGridRef.current;
      const ring = cursorRingRef.current;
      const qx = gsap.quickTo(ring, 'x', { duration: 0.12, ease: 'power3' });
      const qy = gsap.quickTo(ring, 'y', { duration: 0.12, ease: 'power3' });

      const onMove = (e: MouseEvent) => {
        qx(e.clientX - 12);
        qy(e.clientY - 12);
      };
      const onEnter = () => {
        gsap.to(ring, { scale: 1, opacity: 1, duration: 0.15 });
      };
      const onLeave = () => {
        gsap.to(ring, { scale: 0.6, opacity: 0, duration: 0.15 });
      };

      grid.addEventListener('mousemove', onMove);
      grid.addEventListener('mouseenter', onEnter);
      grid.addEventListener('mouseleave', onLeave);
      removeCursorListeners = () => {
        grid.removeEventListener('mousemove', onMove);
        grid.removeEventListener('mouseenter', onEnter);
        grid.removeEventListener('mouseleave', onLeave);
      };
    }

    // Adaptive Nav color detection
    const onNavScroll = () => {
      const y = window.scrollY + 48;
      const heroEl = heroRef.current;
      const testEl = testimonialSectionRef.current;
      const inHero = heroEl ? y >= heroEl.offsetTop && y < heroEl.offsetTop + heroEl.offsetHeight : true;
      const inTest = testEl ? y >= testEl.offsetTop && y < testEl.offsetTop + testEl.offsetHeight : false;
      setNavOnRed(inHero || inTest);
    };
    onNavScroll();
    window.addEventListener('scroll', onNavScroll, { passive: true });

    return () => {
      removeCursorListeners();
      window.removeEventListener('scroll', onNavScroll);
      ctx.revert();
      if (tickerFn) gsap.ticker.remove(tickerFn);
      lenis?.destroy();
    };
  }, []);

  const activeTestimonial = TESTIMONIALS[testimonialIdx] ?? TESTIMONIALS[0]!;
  const activeService = SERVICES[activeServiceIdx] ?? SERVICES[0]!;

  const handleBookCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isContactValid) return;
    toast({
      variant: 'success',
      title: 'Consultation Request Received',
      description: `Thank you, ${fullName}. Sign in with GitHub to launch an instant repository scan.`,
    });
    setFullName('');
    setCompanyName('');
    setAcceptedTerms(false);
  };

  return (
    <div
      ref={rootRef}
      className={`min-h-screen flex flex-col font-sans ${
        user ? 'bg-[#191D1F] text-white' : 'bg-[#F8FBFF] text-slate-900'
      }`}
    >
      {/* Decorative Cursor Ring inside Challenge Cards Grid */}
      <div
        ref={cursorRingRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-6 w-6 rounded-full border border-[#D12404] opacity-0 md:block"
      />

      {/* MODERN, SOFT & UNIQUE FLOATING DOCK NAVBAR */}
      <header className="fixed inset-x-0 top-4 z-40 flex flex-col items-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto flex items-center gap-2.5 sm:gap-4 rounded-full border p-1.5 backdrop-blur-2xl transition-all duration-300 ${
            navOnRed
              ? 'border-white/90 bg-white/80 text-slate-800 shadow-[0_10px_34px_rgba(37,99,235,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]'
              : 'border-white/15 bg-[#222628]/85 text-white shadow-[0_12px_36px_rgba(0,0,0,0.45)]'
          }`}
        >
          {/* Brand Capsule */}
          <Link
            href="/"
            className={`flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 transition-colors ${
              navOnRed
                ? 'border-slate-200/70 bg-slate-50/90 hover:bg-white'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <RepoLensLogo className="h-6 w-6 rounded-full" />
            <span className={`text-sm font-semibold tracking-tight ${navOnRed ? 'text-slate-900' : 'text-white'}`}>
              RepoLens
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </Link>

          {/* Center: Soft Pill Track (shown when lower sections are mounted) */}
          {user && (
            <nav
              className={`hidden md:flex items-center gap-0.5 rounded-full border p-1 ${
                navOnRed
                  ? 'border-slate-200/60 bg-slate-100/75'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <a
                href="#services"
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  navOnRed
                    ? 'text-slate-700 hover:text-blue-700 hover:bg-white/80'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Services
              </a>
              <a
                href="#challenges"
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  navOnRed
                    ? 'text-slate-600 hover:text-blue-700 hover:bg-white/80'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Challenges
              </a>
              <a
                href="#testimonials"
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  navOnRed
                    ? 'text-slate-600 hover:text-blue-700 hover:bg-white/80'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  navOnRed
                    ? 'text-slate-600 hover:text-blue-700 hover:bg-white/80'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Contact
              </a>
            </nav>
          )}

          {/* Right: Gradient Pill CTA + Mobile trigger */}
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(15,23,42,0.22)] hover:-translate-y-0.5 transition-all"
              >
                <span>Dashboard</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <a
                href={`${API_BASE_URL}/api/auth/github`}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] hover:-translate-y-0.5 transition-all"
              >
                <span>Sign in</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className={`rounded-full p-2 md:hidden ${
                navOnRed ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Soft Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-20 z-40 mx-auto w-[90%] max-w-sm rounded-3xl border border-white/80 bg-white/95 p-3 text-slate-800 shadow-xl backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {user && (
              <>
                <a href="#services" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">
                  Services
                </a>
                <a href="#challenges" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">
                  Challenges
                </a>
                <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">
                  Testimonials
                </a>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">
                  Contact
                </a>
              </>
            )}
            <a
              href={user ? '/dashboard' : `${API_BASE_URL}/api/auth/github`}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white font-semibold"
            >
              <span>{user ? 'Open Dashboard' : 'Login with GitHub'}</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </nav>
        </div>
      )}

      {/* 1. BRIGHT LIGHT FULL-SCREEN HERO WITH 3D CODE CUBE ON RIGHT */}
      <section
        ref={heroRef}
        className="relative min-h-screen min-h-[100dvh] flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-[#ECF3FF] to-[#DBEAFE] px-[4.5%] pb-14 pt-28 text-slate-900"
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <HeroWireframeCanvas
            strokeColor="rgba(37, 99, 235, 0.12)"
            showHighlightNode={false}
          />
        </div>

        <div className="relative z-20 mx-auto w-full max-w-[1360px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* Left 7 Cols: Headline, CTAs & Live Capability Strip */}
            <div className="lg:col-span-7">
              <div className="animate-text-reveal mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-white/85 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI-Assisted Repository Security &amp; Architecture</span>
              </div>

              <h1 className="max-w-3xl text-[clamp(38px,3.8vw,58px)] font-bold leading-[1.08] tracking-[-0.03em] text-slate-900">
                <span className="block overflow-hidden">
                  <span className="hero-h1-line block">Secure Every Commit.</span>
                </span>
                <span className="block overflow-hidden">
                  <span className="hero-h1-line block">
                    Ship With{' '}
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                      Zero Blind Spots.
                    </span>
                  </span>
                </span>
              </h1>

              <p
                ref={heroParaRef}
                className="mt-5 max-w-xl text-sm leading-[1.65] text-slate-600 sm:text-base"
              >
                RepoLens combines Shannon entropy secret detection, OSV.dev CVE intelligence, and
                1-click GitHub Fix PRs—giving engineering teams instant clarity without alert noise.
              </p>

              <div ref={heroCtaRef} className="mt-7 flex flex-wrap items-center gap-3">
                {!loading && user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="liquid-btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold"
                    >
                      <span>Open Dashboard</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <a
                      href="#services"
                      className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/80 px-6 py-3.5 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md hover:bg-white transition-all"
                    >
                      <span>Explore Platform</span>
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href={`${API_BASE_URL}/api/auth/github`}
                      className="liquid-btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold"
                    >
                      <span>Connect GitHub Repo</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <Link
                      href="/privacy"
                      className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/80 px-6 py-3.5 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md hover:bg-white transition-all"
                    >
                      <span>Security &amp; Privacy</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Compact Frosted Highlights Strip */}
              <div className="animate-text-delay-2 mt-8 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/80 bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                    Entropy + AST
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">
                    Secret &amp; Pattern Scan
                  </div>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                    OSV.dev + SBOM
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">
                    Live CVE &amp; License
                  </div>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                    1-Click Fix PR
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">
                    Auto-Patch Branches
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Realistic Interactive Rotatable 3D Code Cube */}
            <div ref={heroCodeRef} className="lg:col-span-5 flex flex-col items-center">
              <CodeCube3D className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {user && (
        <>
          {/* 2. LOGO MARQUEE + CHARACTER-BY-CHARACTER STATEMENT (DARK #191D1F) */}
          <section ref={statementRef} className="border-b border-[#2A2E30] bg-[#191D1F]">
        <div className="overflow-hidden border-b border-[#2A2E30] py-7">
          <div className="animate-cy-marquee items-center gap-16 px-8">
            {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, idx) => (
              <span
                key={`${logo}-${idx}`}
                className="shrink-0 font-sans text-lg font-medium tracking-tight text-[#5C6062]"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[1360px] px-[4.5%] py-[120px]">
          <p className="max-w-5xl text-[clamp(24px,2.2vw,36px)] font-normal leading-[1.25]">
            {STATEMENT_TEXT.split('').map((ch, idx) => (
              <span key={idx} className="stmt-char text-[#5C6062]">
                {ch}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* 3. KEY CHALLENGES WE SOLVE (CASE STUDIES) */}
      <section id="challenges" className="border-b border-[#2A2E30] bg-[#191D1F] px-[4.5%] py-[120px]">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8F91]">
                CASE STUDIES
              </span>
            </div>
            <div className="md:col-span-5">
              <h2 className="text-[clamp(36px,3vw,48px)] font-light leading-[1.1] text-white">
                Key Challenges
                <br />
                We Solve.
              </h2>
            </div>
          </div>

          <div ref={challengesGridRef} className="grid grid-cols-1 gap-1 md:grid-cols-3">
            {CHALLENGES.map((card, idx) => (
              <div
                key={card.title}
                onClick={() => setActiveServiceIdx(idx)}
                className="group flex cursor-pointer flex-col justify-between border border-[#2A2E30] bg-[#222628] p-6 transition-colors duration-300 hover:border-[#D12404]"
              >
                <div>
                  <h3 className="border-b border-[#2A2E30] pb-3 text-[17px] font-medium text-white">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-[12px] leading-[1.6] text-[#8A8F91] sm:text-[13px]">
                    {card.description}
                  </p>
                </div>

                {/* Grey -> Red Wireframe Sphere */}
                <div className="my-12 flex items-center justify-center text-[#5C6062] transition-all duration-300 group-hover:scale-[1.06] group-hover:text-[#D12404]">
                  {card.orb === 'geodesic' && (
                    <GeodesicOrbSvg className="transition-transform duration-700 group-hover:rotate-12" />
                  )}
                  {card.orb === 'latitude' && (
                    <LatitudeOrbSvg className="transition-transform duration-700 group-hover:-rotate-12" />
                  )}
                  {card.orb === 'torus' && (
                    <TorusMeshSvg className="transition-transform duration-700 group-hover:rotate-6" />
                  )}
                </div>

                {/* Outlined -> Red Filled Button + Expanding ↗ Cell */}
                <div className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveServiceIdx(idx);
                      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex flex-1 items-center justify-center border border-[#2A2E30] py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-white transition-colors duration-300 group-hover:border-[#D12404] group-hover:bg-[#D12404]"
                  >
                    LOOK HOW WE SOLVE THIS
                  </button>
                  <span className="flex w-0 items-center justify-center overflow-hidden bg-[#D12404] text-white opacity-0 transition-all duration-300 group-hover:w-8 group-hover:opacity-100">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CLIENTS ABOUT OUR WORK (TESTIMONIALS — PINNED EXPANSION) */}
      <section
        id="testimonials"
        ref={testimonialSectionRef}
        className="relative min-h-[82vh] overflow-hidden border-b border-[#2A2E30] bg-[#191D1F]"
      >
        {/* Expanding Red Panel */}
        <div
          ref={testimonialRedBoxRef}
          className="absolute inset-0 bg-[#D12404]"
          style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-45">
            <HeroWireframeCanvas strokeColor="rgba(255,255,255,0.22)" showHighlightNode={false} />
          </div>
          <div className="pointer-events-none absolute bottom-0 right-4 w-52 opacity-75 sm:w-72">
            <CyberSilhouetteSvg className="h-auto w-full -scale-x-100" />
          </div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-[1360px] flex-col justify-between px-[4.5%] py-20">
          <div className="flex items-start justify-between">
            <h2 className="text-[clamp(36px,3vw,48px)] font-light leading-[1.1] text-white">
              Clients About
              <br />
              Our Work.
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/80">
              TESTIMONIALS
            </span>
          </div>

          <div className="my-12 max-w-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#191D1F] font-mono text-xs font-semibold text-white">
                AD
              </div>
              <span className="font-mono text-[11px] text-white/90">
                {activeTestimonial.author}
              </span>
            </div>

            <blockquote
              key={testimonialIdx}
              className="text-[13px] font-medium leading-[1.55] text-white sm:text-[15px] transition-all duration-500"
            >
              &ldquo;{activeTestimonial.quote}&rdquo;
            </blockquote>
          </div>

          {/* Pagination bottom-left (‹ 1 / 3 ›) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setTestimonialIdx((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
              }
              aria-label="Previous testimonial"
              className="flex h-8 w-8 items-center justify-center border border-white/25 bg-black/25 text-white hover:bg-white hover:text-[#191D1F] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-xs text-white">
              {testimonialIdx + 1} / {TESTIMONIALS.length}
            </span>
            <button
              type="button"
              onClick={() => setTestimonialIdx((p) => (p + 1) % TESTIMONIALS.length)}
              aria-label="Next testimonial"
              className="flex h-8 w-8 items-center justify-center border border-white/25 bg-black/25 text-white hover:bg-white hover:text-[#191D1F] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. TAKE A LOOK AT WHAT WE OFFER (PINNED & SCRUBBED SERVICES) */}
      <section id="services" ref={servicesSectionRef} className="border-b border-[#2A2E30] bg-[#191D1F] px-[4.5%] py-[120px]">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8F91]">
                SERVICES
              </span>
            </div>
            <div className="md:col-span-5">
              <h2 className="text-[clamp(36px,3vw,48px)] font-light leading-[1.1] text-white">
                Take a Look at
                <br />
                What We Offer.
              </h2>
            </div>
          </div>

          {/* Mobile/Quick switcher tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {SERVICES.map((srv, idx) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => {
                  setActiveServiceIdx(idx);
                  setServiceMorph(idx);
                  setServiceProgress((idx + 1) / SERVICES.length);
                }}
                className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                  activeServiceIdx === idx
                    ? 'border-[#D12404] bg-[#D12404] text-white'
                    : 'border-[#2A2E30] bg-[#222628] text-[#8A8F91] hover:text-white'
                }`}
              >
                /{srv.id} · {srv.title}
              </button>
            ))}
          </div>

          <div className="relative border border-[#2A2E30] bg-[#222628] p-6 sm:p-10">
            {/* Animated 1px Red Border Draw */}
            <div
              ref={servicesBorderRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 border border-[#D12404]"
              style={{ clipPath: `inset(0 ${100 - serviceProgress * 100}% 0 0)` }}
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Headline + /0X + Progress Bar */}
              <div className="flex flex-col justify-between space-y-10 lg:col-span-4">
                <h3 className="text-2xl font-light leading-snug text-white sm:text-3xl">
                  {activeService.headline}
                </h3>

                <div>
                  <div className="mb-2 flex items-center justify-between font-mono text-xs">
                    <span className="text-[#D12404]">/{activeService.id}</span>
                    <span className="text-[#5C6062]">0{activeServiceIdx + 1} / 03</span>
                  </div>
                  <div className="h-[2px] w-full bg-[#2A2E30]">
                    <div
                      className="h-full bg-[#D12404] transition-all duration-300"
                      style={{ width: `${Math.round(serviceProgress * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Center: Morphing 3D Red Wireframe Plane */}
              <div className="relative h-56 lg:col-span-4">
                <HeroWireframeCanvas
                  strokeColor="rgba(209, 36, 4, 0.78)"
                  highlightColor="#D12404"
                  highlightRow={3 + activeServiceIdx}
                  highlightCol={6 + activeServiceIdx}
                  morphProgress={serviceMorph}
                />
              </div>

              {/* Right Column: Title, 3 Square Red Bullets, LEARN MORE */}
              <div className="space-y-6 lg:col-span-4">
                <h4 className="text-[17px] font-medium text-white">{activeService.title}</h4>

                <ul className="space-y-4">
                  {activeService.bullets.map((b) => (
                    <li key={b.lead} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 bg-[#D12404]"
                      />
                      <p className="text-[12px] leading-[1.6] text-[#8A8F91] sm:text-[13px]">
                        <strong className="font-medium text-white">{b.lead}</strong> {b.desc}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 flex items-stretch gap-1">
                  <a
                    href={user ? '/dashboard' : `${API_BASE_URL}/api/auth/github`}
                    className={`flex flex-1 items-center justify-center border py-3 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                      activeServiceIdx === 2
                        ? 'border-[#D12404] bg-[#D12404] text-white'
                        : 'border-[#2A2E30] bg-transparent text-white hover:border-[#D12404]'
                    }`}
                  >
                    LEARN MORE
                  </a>
                  {activeServiceIdx === 2 && (
                    <span className="flex w-10 items-center justify-center bg-[#D12404] text-white">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LET'S STRENGTHEN SECURITY — GET IN TOUCH TODAY */}
      <section id="contact" className="border-b border-[#2A2E30] bg-[#191D1F] px-[4.5%] py-[120px]">
        <div className="mx-auto max-w-[1360px]">
          <h2 className="mb-12 max-w-2xl text-[clamp(36px,3vw,48px)] font-light leading-[1.1] text-white">
            Let&apos;s Strengthen Security — Get in Touch Today
          </h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Red Square Panel */}
            <div className="relative overflow-hidden bg-[#D12404] p-8 lg:col-span-6">
              <div className="pointer-events-none absolute inset-0 opacity-45">
                <HeroWireframeCanvas
                  strokeColor="rgba(255,255,255,0.25)"
                  showHighlightNode={false}
                />
              </div>

              <svg
                viewBox="0 0 360 120"
                fill="none"
                aria-hidden="true"
                className="relative z-10 mb-6 h-24 w-full"
              >
                <path
                  ref={contactCurveRef}
                  d="M 10 95 C 90 20, 210 110, 345 25"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <circle cx="345" cy="25" r="5" fill="#FFFFFF" className="animate-pulse" />
              </svg>

              <div className="relative z-10">
                <CodeWindow />
              </div>
            </div>

            {/* Right Multi-Step Dark Form */}
            <form
              onSubmit={handleBookCall}
              className="flex flex-col justify-between border border-[#2A2E30] bg-[#222628] p-6 sm:p-10 lg:col-span-6"
            >
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8F91]">
                    <span>STEP 1 OF 3</span>
                  </div>
                  <div className="h-[1px] w-full bg-[#2A2E30]">
                    <div className="h-full w-1/3 bg-[#D12404]" />
                  </div>
                </div>

                <div>
                  <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8F91]">
                    WHO&apos;S THIS TRIAL FOR
                  </span>
                  <div className="space-y-2 text-[13px] text-white">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="radio"
                        name="trialFor"
                        checked={trialFor === 'own'}
                        onChange={() => setTrialFor('own')}
                        className="accent-[#D12404]"
                      />
                      <span>A Business I Own Or Work For</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="radio"
                        name="trialFor"
                        checked={trialFor === 'client'}
                        onChange={() => setTrialFor('client')}
                        className="accent-[#D12404]"
                      />
                      <span>A Client&apos;s Business</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border-b border-[#2A2E30] bg-transparent py-2.5 text-sm text-white placeholder:text-[#5C6062] focus:border-[#D12404] focus:outline-none transition-colors duration-200"
                  />
                  <input
                    type="text"
                    placeholder="Company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border-b border-[#2A2E30] bg-transparent py-2.5 text-sm text-white placeholder:text-[#5C6062] focus:border-[#D12404] focus:outline-none transition-colors duration-200"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[#8A8F91]">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="accent-[#D12404]"
                  />
                  <span>
                    I accept the{' '}
                    <span className="text-[#D12404] underline underline-offset-2">
                      CyFocus Trial Agreement
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-8 flex items-stretch gap-1">
                <button
                  type="submit"
                  disabled={!isContactValid}
                  className={`flex flex-1 items-center justify-center border py-3.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    isContactValid
                      ? 'border-[#D12404] bg-[#D12404] text-white cursor-pointer'
                      : 'border-[#2A2E30] bg-transparent text-[#5C6062] cursor-not-allowed'
                  }`}
                >
                  BOOK A CALL
                </button>
                <span
                  className={`flex w-11 items-center justify-center border transition-colors ${
                    isContactValid
                      ? 'border-[#D12404] bg-[#D12404] text-white'
                      : 'border-[#2A2E30] bg-transparent text-[#5C6062]'
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-[#191D1F] px-[4.5%] py-16 text-xs text-[#8A8F91]">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RepoLensLogo className="h-5 w-5" />
              <span className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-white">
                CY · FOCUS®
              </span>
            </div>
            <p className="text-[11px] text-[#5C6062]">©All rights Reserved</p>
          </div>

          <div className="flex flex-col gap-2">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#challenges" className="hover:text-white transition-colors">Resources</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Blog</a>
            <a href="#contact" className="hover:text-white transition-colors">Company</a>
          </div>

          <div className="flex flex-col gap-2">
            <a href="#testimonials" className="hover:text-white transition-colors">Blog</a>
            <a href="https://github.com/sayanthkv/Repolens" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a>
            <a href="https://github.com/sayanthkv/Repolens" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">YouTube</a>
            <a href="https://github.com/sayanthkv/Repolens" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/privacy" className="hover:text-white transition-colors">Legal Info</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">License Agreement</Link>
          </div>
        </div>
      </footer>
        </>
      )}
    </div>
  );
}
