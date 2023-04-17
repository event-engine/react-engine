import {EeUiConfig} from './config';

const injectedConfig = (window as any).eeUiConfig;

/* @todo validate config data */

/**
 * This is the config solely derived from the ee-cockpit.config.js and the default values (not including any overrides).
 * This config can therefore be used even before the initialization of redux.
 */
export const defaultEeUiConfig: EeUiConfig = {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    env: {
        messageBoxUrl: process.env.REACT_APP_MESSAGEBOX_URL || injectedConfig.env.messageBoxUrl || '',
        context: injectedConfig.env.context || {},
        publicOffersUrl: process.env.REACT_APP_PUBLIC_OFFERS_URL || '',
    },
    hooks: {
        preRequestHook: injectedConfig.hooks.preRequestHook || (request => request),
        postRequestHook: injectedConfig.hooks.postRequestHook || (response => response),
    },
};
