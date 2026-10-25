import { useEffect } from 'react';
import { useStore } from '../store/store';

// The scrolling page container (everything except the map). Views use it to bring a memory into view.
let scroller: HTMLElement | null = null;
export const setScroller = (el: HTMLElement | null) => { scroller = el; };
export const getScroller = () => scroller;

/** Scrolls so the element matching `selector` is comfortably in view, like the prototype's «Se i historien». */
export function scrollToSelector(selector: string, delay = 90) {
  setTimeout(() => {
    const sc = scroller;
    const el = sc?.querySelector(selector);
    if (!sc || !el) return;
    const d = el.getBoundingClientRect().top - sc.getBoundingClientRect().top;
    if (d < 90 || d > sc.clientHeight - 90) sc.scrollTop += d - 150;
  }, delay);
}

export const scrollToMem = (id: string) => scrollToSelector('[data-mem="' + CSS.escape(id) + '"]');

/** Sets the mobile top bar title and the document title. */
export function usePageTitle(title: string) {
  useEffect(() => {
    useStore.setState({ pageTitle: title });
    document.title = title ? title + ' – Vår reisebok' : 'Vår reisebok';
  }, [title]);
}
