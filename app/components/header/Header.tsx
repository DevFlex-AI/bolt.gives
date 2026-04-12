import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { usePublicUrlConfig } from '~/lib/public-url-context';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { APP_VERSION } from '~/lib/version';

export function Header() {
  const chat = useStore(chatStore);
  const { adminPanelUrl, createTrialUrl } = usePublicUrlConfig();

  const handleSidebarToggle = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('bolt-sidebar-toggle'));
  };

  return (
    <header
      className={classNames('flex items-center px-2 sm:px-3 md:px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 z-logo text-bolt-elements-textPrimary">
        <button
          type="button"
          onClick={handleSidebarToggle}
          aria-label="Open sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-bolt-elements-textPrimary transition-colors hover:bg-bolt-elements-background-depth-2"
        >
          <div className="i-ph:sidebar-simple-duotone text-lg sm:text-xl" />
        </button>
        <a href="/" className="text-2xl font-semibold text-accent flex items-center gap-3">
          {/* Neural SVG Logo - 5KB vs 1.6MB PNG */}
          <svg viewBox="0 0 120 40" className="h-8 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#00FF41"/>
                <stop offset="100%" style="stop-color:#00E0FF"/>
              </linearGradient>
              <filter id="logoGlow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path d="M8 6L5 19H12L10 32L20 16H13L15 6H8Z" 
                  fill="url(#logoGradient)" 
                  filter="url(#logoGlow)"/>
            <text x="26" y="22" fontFamily="Geist Mono, monospace" fontSize="14" fontWeight="600" fill="#ffffff">bolt</text>
            <text x="56" y="22" fontFamily="Geist Mono, monospace" fontSize="14" fontWeight="600" fill="url(#logoGradient)">.gives</text>
          </svg>
          <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full border border-neural-500/30 bg-neural-500/10 text-[10px] font-mono text-neural-500">
            v{APP_VERSION}
          </span>
        </a>
      </div>

      <span className="hidden md:block flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
        {chat.started ? <ClientOnly>{() => <ChatDescription />}</ClientOnly> : null}
      </span>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <a
          href="/tenant"
          className="hidden sm:inline-flex text-xs sm:text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary underline-offset-4 hover:underline"
        >
          Tenant Portal
        </a>
        <a
          href={createTrialUrl}
          className="hidden sm:inline-flex text-xs sm:text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary underline-offset-4 hover:underline"
        >
          Cloudflare Trials
        </a>
        <a
          href={adminPanelUrl}
          className="hidden sm:inline-flex text-xs sm:text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary underline-offset-4 hover:underline"
        >
          Admin Panel
        </a>
        <a
          href="/changelog"
          className="text-xs sm:text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary underline-offset-4 hover:underline"
        >
          Changelog
        </a>

        {chat.started ? (
          <ClientOnly>
            {() => (
              <div className="hidden sm:block">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        ) : null}
      </div>
    </header>
  );
}
