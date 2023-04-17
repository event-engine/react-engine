import {Action, handleActions} from 'redux-actions';
import {AxiosResponse} from 'axios';
import {
    CommandClearedPayload,
    CommandExecutedPayload,
    CommandExecutionBeganPayload,
    CommandExecutionFailedPayload, commandCleared, commandExecuted, commandExecutionBegan, commandExecutionFailed,
} from '../action/commandEvents';

export interface CommandState {
    response: AxiosResponse|null;
    lastCommand: {name: string, payload: any}|null
    error: Error|null;
    commandsExecuted: number;
}

export const initialState = {
    response: null,
    error: null,
    lastCommand: null,
    commandsExecuted: 0,
};

/* eslint @typescript-eslint/no-unused-vars: 0 */
export const reducer = handleActions<CommandState, any>(
    {
        [commandExecutionBegan.toString()]: (state = initialState, action: Action<CommandExecutionBeganPayload>) => {
            if (!state) {
                return state;
            }

            return {
                ...state,
                response: null,
                error: null,
                lastCommand: null,
            };
        },
        [commandExecuted.toString()]: (state = initialState, action: Action<CommandExecutedPayload>) => {
            if (!state) {
                return state;
            }

            return {
                ...state,
                response: action.payload.result,
                lastCommand: action.payload.command,
                error: null,
                commandsExecuted: state.commandsExecuted + 1,
            };
        },
        [commandExecutionFailed.toString()]: (state = initialState, action: Action<CommandExecutionFailedPayload>) => {
            if (!state) {
                return state;
            }

            return {
                ...state,
                response: action.payload.response || null,
                error: action.payload.error,
            };
        },
        [commandCleared.toString()]: (state = initialState, action: Action<CommandClearedPayload>) => {
            if (!state) {
                return state;
            }

            return {
                ...state,
                response: null,
                error: null,
                lastCommand: null,
            };
        },
    },
    initialState,
);
