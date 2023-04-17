import {ReduxState} from '../../reducer';
import {createSelector} from 'reselect';

const stateKey = 'command';

export const commandResponseSelector = (state: ReduxState) => state[stateKey].response;
export const commandErrorSelector = (state: ReduxState) => state[stateKey].error;
export const commandsExecutedSelector = (state: ReduxState) => state[stateKey].commandsExecuted;
export const lastCommandSelector = (state: ReduxState) => state[stateKey].lastCommand;

export const makeCommandResponseSelector = () => {
    return createSelector([commandResponseSelector], response => {
        return response;
    });
};

export const makeCommandErrorSelector = () => {
    return createSelector([commandErrorSelector], error => {
        return error;
    });
};

export const makeCommandExecutedSelector = () => {
    return createSelector([commandsExecutedSelector], count => {
        return count;
    })
};

export const makeLastCommandSelector = () => {
    return createSelector([lastCommandSelector], lastCommand => {
        return lastCommand;
    })
}

