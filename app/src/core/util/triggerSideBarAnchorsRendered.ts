export const WINDOW_EVENT_SIDEBAR_ANCHORS_RENDERED = 'SideBarAnchorsRendered';

export const triggerSideBarAnchorsRendered = () => {
    const event = document.createEvent('Event');

    event.initEvent(WINDOW_EVENT_SIDEBAR_ANCHORS_RENDERED, true, true);

    window.dispatchEvent(event);
}

export const listenOnSideBarAnchorsRendered = (listener: () => void) => {
    window.addEventListener(WINDOW_EVENT_SIDEBAR_ANCHORS_RENDERED, listener);
}

export const stopListeningOnSideBarAnchorsRendered = (listener: () => void) => {
    window.removeEventListener(WINDOW_EVENT_SIDEBAR_ANCHORS_RENDERED, listener);
}
