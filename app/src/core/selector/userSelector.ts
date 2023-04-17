import {ReduxState} from "../../reducer";
import {createSelector} from "reselect";
import {UserState} from "../reducer/userReducer";

const stateKey = 'user';

export const userSelector = (state: ReduxState) => state[stateKey];

export const makeUserSelector = () => {
    return createSelector(
        [userSelector],
        (user: UserState): UserState => user
    )
}
