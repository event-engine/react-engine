import {Action, handleActions} from "redux-actions";
import {signedIn, SignedInPayload} from "../action/userEvents";

export interface UserState {
    uid: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    signedIn: boolean;
    // @TODO: add roles kc.resourceAccess!.inspectio.roles
}

export const initialState = {
    uid: '',
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    signedIn: false,
};

export const reducer = handleActions<UserState, any>({
    [signedIn.toString()]: (state = initialState, action: Action<SignedInPayload>) => {
        if(!state) {
            return state;
        }

        return action.payload;
    }
}, initialState);
