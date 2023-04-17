import {ReduxState} from '../../reducer';
import {createSelector} from 'reselect';

const stateKey = 'settings';

export const messageBoxUrlSelector = (state: ReduxState) => state[stateKey].messageBoxUrl;
export const contextSelector = (state: ReduxState) => state[stateKey].context;
export const themeSelector = (state: ReduxState) => state[stateKey].theme;

export const makeMessageBoxUrlSelector = () => {
    return createSelector([messageBoxUrlSelector], messageBoxUrl => {
        return messageBoxUrl;
    });
};

export const makeContextSelector = () => {
    return createSelector([contextSelector], context => {
        return context;
    });
};

export const makeThemeSelector = () => {
    return createSelector([themeSelector], theme => {
        return theme;
    });
};
