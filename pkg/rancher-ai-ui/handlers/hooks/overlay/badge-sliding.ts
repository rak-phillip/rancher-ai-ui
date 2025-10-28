import { waitFor } from '@shell/utils/async';
import { warn } from '../../../utils/log';
import { Context } from '../../../types';
import { Store } from 'vuex';
import { nextTick } from 'vue';
import { HooksOverlay } from './index';
import Chat from '../../chat';
import TemplateMessage from '../template-message';
import { formatMessagePromptWithContext } from '../../../utils/format';

const enum Theme {
  Light = 'light', // eslint-disable-line no-unused-vars
  Dark = 'dark', // eslint-disable-line no-unused-vars
}

class BadgeSlidingOverlay extends HooksOverlay {
  constructor(selector: string) {
    super();
    this.selector = selector;
  }

  private computeThemeProperties(badge: HTMLElement, theme: Theme): { badge: any, overlay: any } {
    const out = {
      badge:   { background: '' },
      overlay: {
        background: '#496192',
        color:      'var(--primary-text)',
      },
    };

    const bgColor = getComputedStyle(document.body).getPropertyValue('--body-bg');
    const opacity = theme === Theme.Dark ? '30%' : '10%';

    badge.classList.forEach((c) => {
      if (c.startsWith('bg-')) {
        const classId = c.replaceAll('bg-', '');
        const classBgColor = getComputedStyle(document.body).getPropertyValue(`--${ classId }`);

        switch (classId) {
        case 'error':
          if (theme === Theme.Light) {
            out.badge.background = classBgColor;
          }
          break;
        default:
          out.badge.background = `color-mix(in srgb, ${ classBgColor } ${ opacity }, ${ bgColor })`;
          break;
        }
      }
    });

    return out;
  }

  /**
   * Handle changes in the parent container's position.
   * @param target The target element.
   * @param container The parent container element.
   * @param overlay The overlay element.
   */
  private handleParentPositionChange(target: HTMLElement, container: HTMLElement, overlay: HTMLElement) {
    // destroy overlay if the container/parent moves (position changes)
    let lastContainerRect = container.getBoundingClientRect();
    const onContainerPosChange = () => {
      try {
        const r = container.getBoundingClientRect();

        if (r.top !== lastContainerRect.top || r.left !== lastContainerRect.left) {
          // parent moved -> remove overlays for this target
          this.destroy(target, true);
        } else {
          lastContainerRect = r;
        }
      } catch (e) {
        warn('Error checking container position change', e);
      }
    };

    const containerRO = new ResizeObserver(onContainerPosChange);

    containerRO.observe(container);

    const containerMO = new MutationObserver(onContainerPosChange);

    containerMO.observe(container, {
      attributes:      true,
      attributeFilter: ['style', 'class']
    });

    const scrollHandler = () => onContainerPosChange();

    window.addEventListener('scroll', scrollHandler, true);

    // attach cleanup so destroy() can call it (avoid leaks if overlay removed directly)
    (overlay as any).__parentPositionCleanup = () => {
      try {
        containerRO.disconnect();
      } catch (e) {
        warn('Error disconnecting ResizeObserver', e);
      }
      try {
        containerMO.disconnect();
      } catch (e) {
        warn('Error disconnecting MutationObserver', e);
      }
      try {
        window.removeEventListener('scroll', scrollHandler, true);
      } catch (e) {
        warn('Error removing scroll event listener', e);
      }
    };
  }

  /**
   * Cleanup parent position change handlers
   */
  private cleanupParentPosition(overlay: any) {
    try {
      if (typeof overlay.__parentPositionCleanup === 'function') {
        overlay.__parentPositionCleanup();
      }
    } catch (e) {
      warn('Error during parent position cleanup', e);
    }
  }

  create(store: Store<any>, target: HTMLElement, badge: HTMLElement, ctx: Context, globalCtx: Context[] = []) {
    const t = store.getters['i18n/t'];
    const theme = store.getters['prefs/theme'] as Theme;

    const {
      badge: badgeProps,
      overlay: overlayProps
    } = this.computeThemeProperties(badge, theme);

    const overlay = badge.cloneNode(true) as HTMLElement;

    const badgeRect = badge.getBoundingClientRect();
    const badgeStyle = getComputedStyle(badge);

    overlay.classList.add(`${ HooksOverlay.defaultClassPrefix }-${ this.getSelector() }`);
    overlay.style.zIndex = '10';
    overlay.style.backgroundColor = overlayProps.background;
    overlay.style.color = 'transparent';
    overlay.style.position = 'fixed';
    overlay.style.fontSize = badgeStyle.fontSize;
    overlay.style.top = `${ badgeRect.top }px`;
    overlay.style.left = `${ badgeRect.left + 2 }px`;
    overlay.style.height = `${ badgeRect.height }px`;
    overlay.style.width = `${ badgeRect.width - 2 - parseFloat(badgeStyle.marginRight) - parseFloat(badgeStyle.marginLeft) }px`;
    overlay.style.paddingRight = '3px';
    overlay.style.transition = 'width 0.2s cubic-bezier(0.4,0,0.2,1)';
    overlay.style.cursor = 'pointer';
    overlay.textContent = t('ai.hooks.overlay.badgeSliding.label');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'flex-end';
    overlay.style.whiteSpace = 'nowrap';
    overlay.style.overflow = 'hidden';
    overlay.style.boxSizing = 'border-box'; // ensure padding is included in size

    badge.style.zIndex = Math.max(parseInt(badge.style.zIndex || '0'), 12).toString();
    badge.style.background = badgeProps.background;

    const icon = document.createElement('i');

    icon.classList.add('icon-ai');
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.flex = '0 0 auto';
    icon.style.width = `${ Math.max(16, Math.round(badgeRect.height * 0.6)) }px`;
    icon.style.height = `${ Math.max(16, Math.round(badgeRect.height * 0.6)) }px`;
    icon.style.marginLeft = `${ Math.round(badgeRect.height * 0.3) }px`;
    icon.style.marginRight = `${ Math.round(badgeRect.height * 0.2) }px`;
    icon.style.lineHeight = '1';
    icon.style.color = overlayProps.color;
    icon.style.boxSizing = 'content-box';

    overlay.appendChild(icon);

    const container = (target.parentElement || target) as HTMLElement;

    container.appendChild(overlay);

    // Animate width expansion after a short delay
    setTimeout(() => {
      overlay.style.width = `${ parseInt(overlay.style.width) + 30 }px`;
    }, 10);

    this.handleParentPositionChange(target, container, overlay);

    overlay.addEventListener('click', (e) => {
      this.action(store, e, overlay, ctx, globalCtx);
    });

    overlay.addEventListener('mouseenter', () => {
      overlay.style.width = `${ parseInt(overlay.style.width) + (20 + (overlay.textContent?.length || 0) + parseInt(badgeStyle.fontSize) * 1.4 + parseFloat(badgeStyle.marginRight) + parseFloat(badgeStyle.marginLeft)) }px`;
      overlay.style.color = overlayProps.color;
    });

    overlay.addEventListener('mouseleave', () => {
      if (!HooksOverlay.allHooksKeyPressed) {
        this.destroy(target);
      } else {
        overlay.style.width = `${ parseInt(overlay.style.width) - (20 + (overlay.textContent?.length || 0) + parseInt(badgeStyle.fontSize) * 1.4 + parseFloat(badgeStyle.marginRight) + parseFloat(badgeStyle.marginLeft)) }px`;
      }
    });
  }

  action(store: Store<any>, e: Event, overlay: HTMLElement, ctx: Context, globalCtx: Context[]) {
    e.stopPropagation();

    // const obj = context.value as any;

    // const ctx: Context[] = [{
    //   tag:         obj?.kind?.toLowerCase(),
    //   description: obj?.kind,
    //   icon:        context.icon,
    //   value:       obj?.name
    // }];

    // store.commit('rancher-ai-ui/context/reset');
    // if (ctx) {
    //   store.commit('rancher-ai-ui/context/add', ctx);
    // }

    const message = TemplateMessage.fill(ctx, globalCtx);

    store.dispatch('rancher-ai-ui/chat/init', {
      chatId:   'default',
      messages: [message],
    });

    nextTick(async() => {
      Chat.open(store);

      // TODO remove hacky waitFor, the WS should be already available or opened by now
      try {
        await waitFor(() => !!store.getters['rancher-ai-ui/connection/ws'], 'Wait for ws open', 2000, 100, false);
      } catch (err) {
        warn('WebSocket not available, cannot send message', err);
      }

      const ws = store.getters['rancher-ai-ui/connection/ws'];

      if (!!ws) {
        ws.send(formatMessagePromptWithContext(message.messageContent || '', message.contextContent || []));
      }

      overlay.remove();
    });
  }

  destroy(target: HTMLElement, immediate = false) {
    (target.parentElement as HTMLElement).querySelectorAll(`.${ HooksOverlay.defaultClassPrefix }-${ this.getSelector() }`).forEach((overlay: any) => {
      if (overlay && !(overlay.matches(':hover') || (overlay.querySelector(':hover') !== null))) {
        this.cleanupParentPosition(overlay);

        // Animate width shrink before removing
        overlay.style.transition = 'width 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.3s';
        overlay.style.width = `${ 0 }px`;
        overlay.style.opacity = '0';

        setTimeout(() => {
          overlay.remove();
        }, immediate ? 0 : 500);
      }
    });
  }

  setTheme(badge: HTMLElement, theme: Theme) {
    nextTick(() => {
      const { badge: badgeProps } = this.computeThemeProperties(badge, theme);

      badge.style.background = badgeProps.background;
    });
  }
}

export default new BadgeSlidingOverlay('badge-state');
